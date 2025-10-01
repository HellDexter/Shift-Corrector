
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EditableTravelRecord } from './types';
import TravelTable from './components/TravelTable';
import { calculateTimeInCountry, formatToCzechDateTime, parseCzechDateTime } from './utils/timeUtils';
import { AddIcon, ExportIcon, UploadIcon } from './assets/icons';

declare global {
  interface Window {
    XLSX: any;
  }
}

const initialData: Omit<EditableTravelRecord, 'cas' | 'id'>[] = [];


const App: React.FC = () => {
  const [travelRecords, setTravelRecords] = useState<EditableTravelRecord[]>([]);
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortTravelRecords = (records: EditableTravelRecord[]): EditableTravelRecord[] => {
    return [...records].sort((a, b) => {
      const dateA = parseCzechDateTime(a.prijzed);
      const dateB = parseCzechDateTime(b.prijzed);

      if (!dateA && !dateB) return 0;
      // Records with invalid or unparseable prijzed dates go to the end
      if (!dateA) return 1; 
      if (!dateB) return -1;

      return dateA.getTime() - dateB.getTime();
    });
  };

  const recalculateSingleRecordCas = useCallback((record: Omit<EditableTravelRecord, 'cas'> & { cas?: string }): EditableTravelRecord => {
    return {
        ...record,
        id: record.id || uuidv4(),
        zeme: record.zeme || "",
        prijzed: record.prijzed || "",
        odjezd: record.odjezd || "",
        cas: calculateTimeInCountry(record.prijzed, record.odjezd),
    };
  }, []);

  const recalculateAllRecordsCas = useCallback((records: (Omit<EditableTravelRecord, 'cas' | 'id'> & {id?: string, cas?: string })[]): EditableTravelRecord[] => {
    return records.map(rec => recalculateSingleRecordCas({id: rec.id || uuidv4(), ...rec}));
  }, [recalculateSingleRecordCas]);

  useEffect(() => {
    const initialRecordsWithId = initialData.map(rec => ({ ...rec, id: uuidv4() }));
    setTravelRecords(recalculateAllRecordsCas(initialRecordsWithId));
  }, [recalculateAllRecordsCas]);


  const handleUpdateRecord = (updatedRecord: EditableTravelRecord) => {
    setTravelRecords(prevRecords => {
      const originalRecord = prevRecords.find(r => r.id === updatedRecord.id);
      let newRecords = prevRecords.map(rec => (rec.id === updatedRecord.id ? updatedRecord : rec));

      // If a 'new' record is being saved (isEditing becomes false)
      if (originalRecord?.isNew && !updatedRecord.isEditing) {
        const finalRecord = { ...updatedRecord };
        delete finalRecord.isNew; // Remove the temporary 'isNew' flag
        newRecords = newRecords.map(rec => (rec.id === finalRecord.id ? finalRecord : rec));
        return sortTravelRecords(newRecords);
      }
      return newRecords;
    });
  };

  const handleDeleteRecord = (id: string) => {
    setTravelRecords(prevRecords => prevRecords.filter(rec => rec.id !== id));
  };
  
  const createNewEmptyRecord = (): EditableTravelRecord => {
    const now = new Date();
    // Default to a 1-hour slot for the new record
    const defaultStartTime = formatToCzechDateTime(now);
    const defaultEndTimeDate = new Date(now.getTime() + 60 * 60 * 1000); 
    const defaultEndTime = formatToCzechDateTime(defaultEndTimeDate);

    const newRecordBase: Omit<EditableTravelRecord, 'cas'> = {
      id: uuidv4(),
      prijzed: defaultStartTime,
      odjezd: defaultEndTime,
      zeme: "",
      isEditing: true,
      isNew: true, // Mark as a new, unsorted record
    };
    return recalculateSingleRecordCas(newRecordBase);
  };

  const handleAddRecord = () => {
    const newRecord = createNewEmptyRecord();
    // Add the new record to the top of the list for immediate visibility and editing
    setTravelRecords(prevRecords => [newRecord, ...prevRecords]);
  };

  const handleAddRecordRelative = (referenceId: string, above: boolean) => {
    const newRecordBase = createNewEmptyRecord();
    // Records added relatively are marked as 'isNew' so they sort on their first save.
    const newRecord = {...newRecordBase, isNew: true, isEditing: true}; 

    setTravelRecords(prevRecords => {
      const refIndex = prevRecords.findIndex(rec => rec.id === referenceId);
      if (refIndex === -1) { // If reference ID not found, add to top like a normal new record
        return [newRecord, ...prevRecords];
      }

      let updatedRecords = [...prevRecords];
      if (above) {
        updatedRecords.splice(refIndex, 0, newRecord);
      } else {
        updatedRecords.splice(refIndex + 1, 0, newRecord);
      }
      return updatedRecords;
    });
  };

  const handleExportToExcel = () => {
    if (!window.XLSX) {
      alert("XLSX knihovna není načtena. Export není možný.");
      return;
    }
    
    const sortedRecordsForExport = sortTravelRecords(travelRecords.filter(r => !r.isNew));

    if (sortedRecordsForExport.length === 0) {
        alert("Žádná data k exportu.");
        return;
    }
    
    const dataForExport = sortedRecordsForExport.map(({ id, isEditing, isNew, ...rest }) => rest); 
    const worksheet = window.XLSX.utils.json_to_sheet(dataForExport);
    
    // Auto-fit column widths
    const objectMaxLength = [];
    const headers = Object.keys(dataForExport[0]);
    headers.forEach((header) => {
        const headerLength = header ? header.length : 0;
        const maxLength = Math.max(
            headerLength,
            ...dataForExport.map(obj => (obj[header] ? String(obj[header]).length : 0))
        );
        objectMaxLength.push({ wch: maxLength + 2 }); // Add padding
    });
    worksheet["!cols"] = objectMaxLength;

    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "PřekročeníHranic");

    let fileName = "PrekroceniHranicReport.xlsx";
    const firstRecord = sortedRecordsForExport[0];
    const date = parseCzechDateTime(firstRecord.prijzed);

    if (date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        
        const sanitize = (str: string) => str.trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
        
        const sanitizedSPZ = licensePlate ? sanitize(licensePlate) : '';
        const sanitizedName = driverName ? sanitize(driverName) : '';

        const identifierParts = [sanitizedSPZ, sanitizedName].filter(Boolean); // Filters out empty strings
        
        const identifier = identifierParts.length > 0 ? identifierParts.join('_') : 'Report';
        
        fileName = `${month}_${year}_${identifier}.xlsx`;
    }
    
    window.XLSX.writeFile(workbook, fileName);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.XLSX || !window.XLSX.SSF) {
      alert("XLSX knihovna nebo její součást SSF není načtena. Import není možný.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            alert("Soubor neobsahuje žádné listy.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = window.XLSX.utils.sheet_to_json(worksheet, { cellDates: true, defval: "", raw: false });


        if (jsonData.length === 0) {
          alert("Soubor neobsahuje žádná data nebo je první list prázdný.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const firstRow = jsonData[0];
        const headerPrijzed = Object.keys(firstRow).find(h => h.toLowerCase().includes('příjezd') || h.toLowerCase().includes('prijzed'));
        const headerOdjezd = Object.keys(firstRow).find(h => h.toLowerCase().includes('odjezd'));
        const headerZeme = Object.keys(firstRow).find(h => h.toLowerCase().includes('země') || h.toLowerCase().includes('zeme'));
        const headerCas = Object.keys(firstRow).find(h => h.toLowerCase() === 'čas' || h.toLowerCase() === 'cas');


        if (!headerPrijzed || !headerOdjezd || !headerZeme) {
          alert("Soubor neobsahuje požadované sloupce (Příjezd/Prijzed, Odjezd, Země/Zeme). Zkontrolujte hlavičky v souboru.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const importedRecordsBase: Omit<EditableTravelRecord, 'id'>[] = [];
        let skippedRowsCount = 0;

        const processSheetDateValue = (value: any): string => {
          if (value instanceof Date) {
            return formatToCzechDateTime(value);
          } else if (typeof value === 'number') {
            const dateObj = window.XLSX.SSF.parse_date_code(value);
            if (dateObj) {
              const jsDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d, dateObj.H, dateObj.M, dateObj.S || 0);
              return formatToCzechDateTime(jsDate);
            } else {
              console.warn(`Could not parse numeric value '${value}' as date code.`);
              return String(value || "").trim();
            }
          } else {
            return String(value || "").trim();
          }
        };

        for (const row of jsonData) {
          const prijzedValueRaw = row[headerPrijzed!];
          const odjezdValueRaw = row[headerOdjezd!];
          const zemeStr = String(row[headerZeme!] || "").trim();
          const casFromFileRaw = headerCas ? row[headerCas!] : undefined;

          const prijzedStr = processSheetDateValue(prijzedValueRaw);
          const odjezdStr = processSheetDateValue(odjezdValueRaw);
          
          const arrivalValid = parseCzechDateTime(prijzedStr);
          const departureValid = parseCzechDateTime(odjezdStr);

          if (!arrivalValid || !departureValid || zemeStr === "") {
            console.warn(`Přeskakuji řádek kvůli nevalidním nebo chybějícím datům: Příjezd='${prijzedStr}', Odjezd='${odjezdStr}', Země='${zemeStr}'`);
            skippedRowsCount++;
            continue;
          }
           if (arrivalValid.getTime() >= departureValid.getTime()) {
             console.warn(`Přeskakuji řádek: Datum odjezdu ('${odjezdStr}') není po datu příjezdu ('${prijzedStr}').`);
             skippedRowsCount++;
             continue;
          }

          let casStr: string;
          if (casFromFileRaw !== undefined && String(casFromFileRaw).trim() !== "") {
              casStr = String(casFromFileRaw).trim();
          } else {
              casStr = calculateTimeInCountry(prijzedStr, odjezdStr);
          }

          importedRecordsBase.push({
            prijzed: prijzedStr,
            odjezd: odjezdStr,
            zeme: zemeStr,
            cas: casStr, 
            isEditing: false,
          });
        }
        
        if (skippedRowsCount > 0) {
            alert(`${skippedRowsCount} řádků bylo přeskočeno kvůli nevalidním nebo chybějícím datům. Zkontrolujte konzoli pro detaily.`);
        }
        
        const finalImportedRecords = importedRecordsBase.map(rec => ({...rec, id: uuidv4() }));

        if (finalImportedRecords.length === 0 && jsonData.length > 0) {
             alert("Žádné validní záznamy nebyly nalezeny v souboru. Zkontrolujte formát dat, hlavičky a konzoli pro detaily.");
        } else if (finalImportedRecords.length > 0) {
            alert(`Úspěšně nahráno ${finalImportedRecords.length} záznamů.`);
        }
        
        setTravelRecords(sortTravelRecords(finalImportedRecords));
        
      } catch (error) {
        console.error("Chyba při zpracování souboru:", error);
        alert("Došlo k chybě při zpracování souboru. Zkontrolujte formát souboru a konzoli pro detaily.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
          JAFA Korektor
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Report Překročení Hranic
        </p>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Informace o reportu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="licensePlate" className="block text-sm font-medium text-slate-700">SPZ vozidla</label>
              <input
                type="text"
                id="licensePlate"
                name="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm"
                placeholder="1AB 2345"
              />
            </div>
            <div>
              <label htmlFor="driverName" className="block text-sm font-medium text-slate-700">Jméno řidiče</label>
              <input
                type="text"
                id="driverName"
                name="driverName"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm"
                placeholder="Jan Novák"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end my-6 space-x-0 sm:space-x-3 space-y-2 sm:space-y-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .ods"
              className="hidden"
              aria-hidden="true"
            />
            <button
                onClick={handleUploadButtonClick}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
                <UploadIcon className="w-5 h-5 mr-2" />
                Nahrát Report (.xlsx, .ods)
            </button>
            <button
                onClick={handleAddRecord}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition duration-150 ease-in-out"
            >
                <AddIcon className="w-5 h-5 mr-2" />
                Přidat Nový Záznam
            </button>
            <button
                onClick={handleExportToExcel}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition duration-150 ease-in-out"
            >
                <ExportIcon className="w-5 h-5 mr-2 text-green-600" />
                Exportovat do Excelu
            </button>
        </div>
        
        <TravelTable
          records={travelRecords}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onAddRecordRelative={handleAddRecordRelative}
        />
      </main>
      <footer className="text-center mt-12 py-6 border-t border-slate-300">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} JAFA Solutions. Všechna práva vyhrazena.</p>
      </footer>
    </div>
  );
};

export default App;
