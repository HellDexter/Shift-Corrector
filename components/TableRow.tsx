
import React, { useState, useEffect } from 'react';
import { EditableTravelRecord } from '../types';
import { calculateTimeInCountry, parseCzechDateTime, getCzechDayOfWeek, isRangeOverlappingWeekend } from '../utils/timeUtils';
import { DeleteIcon, EditIcon, SaveIcon, CancelIcon, ArrowUpIcon, ArrowDownIcon } from '../assets/icons';

interface TableRowProps {
  record: EditableTravelRecord;
  onUpdateRecord: (updatedRecord: EditableTravelRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecordRelative: (id: string, above: boolean) => void;
}

const TableRow: React.FC<TableRowProps> = ({ record, onUpdateRecord, onDeleteRecord, onAddRecordRelative }) => {
  const [isEditing, setIsEditing] = useState(record.isEditing ?? false);
  const [editData, setEditData] = useState<Partial<EditableTravelRecord>>({
    prijzed: record.prijzed,
    odjezd: record.odjezd,
    zeme: record.zeme,
  });
  const [originalDataOnEdit, setOriginalDataOnEdit] = useState<EditableTravelRecord | null>(null);

  useEffect(() => {
    setIsEditing(record.isEditing ?? false);
    setEditData({
      prijzed: record.prijzed,
      odjezd: record.odjezd,
      zeme: record.zeme,
    });
    if (!(record.isEditing ?? false)) {
        setOriginalDataOnEdit(null); 
    }
  }, [record.isEditing, record.prijzed, record.odjezd, record.zeme]);


  const handleEditToggle = () => {
    if (isEditing) {
      handleCancel();
    } else {
      setEditData({
        prijzed: record.prijzed,
        odjezd: record.odjezd,
        zeme: record.zeme,
      });
      if (!record.isNew) { // Only store original data if it's not a brand new row being edited for the first time
        setOriginalDataOnEdit(JSON.parse(JSON.stringify(record)));
      }
      onUpdateRecord({ ...record, isEditing: true });
    }
  };
  
  const handleSave = () => {
    const currentPrijzed = editData.prijzed || record.prijzed;
    const currentOdjezd = editData.odjezd || record.odjezd;
    const currentZeme = editData.zeme || record.zeme;

    const arrivalDate = parseCzechDateTime(currentPrijzed);
    const departureDate = parseCzechDateTime(currentOdjezd);

    if (!arrivalDate || !departureDate) {
      alert("Neplatný formát data nebo času pro uložení. Použijte DD.MM.RR HH:MM.");
      return;
    }
    if (arrivalDate >= departureDate) {
      alert("Datum odjezdu musí být po datu příjezdu pro uložení.");
      return;
    }
    
    onUpdateRecord({
      ...record, 
      prijzed: currentPrijzed,
      odjezd: currentOdjezd,
      zeme: currentZeme,
      isEditing: false, 
    });
    setOriginalDataOnEdit(null); 
  };

  const handleCancel = () => {
    if (record.isNew) {
      onDeleteRecord(record.id); 
    } else if (originalDataOnEdit) {
      onUpdateRecord({ ...originalDataOnEdit, isEditing: false });
      setEditData({ 
        prijzed: originalDataOnEdit.prijzed,
        odjezd: originalDataOnEdit.odjezd,
        zeme: originalDataOnEdit.zeme,
      });
      setOriginalDataOnEdit(null); 
    } else {
      const lastCas = calculateTimeInCountry(record.prijzed, record.odjezd);
      onUpdateRecord({ ...record, cas: lastCas, isEditing: false });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newLocalEditData = { ...editData, [name]: value };
    setEditData(newLocalEditData); 

    const currentPrijzed = newLocalEditData.prijzed || record.prijzed;
    const currentOdjezd = newLocalEditData.odjezd || record.odjezd;
    const currentZeme = newLocalEditData.zeme || record.zeme;
    
    const arrivalValid = parseCzechDateTime(currentPrijzed);
    const departureValid = parseCzechDateTime(currentOdjezd);
    
    let newCas = record.cas; 

    if (arrivalValid && departureValid && arrivalValid < departureValid) {
      newCas = calculateTimeInCountry(currentPrijzed, currentOdjezd);
    } else if (arrivalValid && departureValid && arrivalValid >= departureValid) {
      newCas = "Chyba data"; 
    } else if (!arrivalValid || !departureValid) {
      newCas = "Neplatný vstup";
    }

    onUpdateRecord({
      ...record, 
      prijzed: currentPrijzed,
      odjezd: currentOdjezd,
      zeme: currentZeme,
      cas: newCas,
      isEditing: true, 
    });
  };

  const inputClass = "w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500";
  const cellClass = "px-3 py-3 text-sm text-slate-700 align-top";
  
  const arrivalDateForDayOfWeek = parseCzechDateTime(record.prijzed);
  const dayOfWeek = arrivalDateForDayOfWeek ? getCzechDayOfWeek(arrivalDateForDayOfWeek) : "-";
  
  const arrivalDateForWeekendCheck = parseCzechDateTime(record.prijzed);
  const departureDateForWeekendCheck = parseCzechDateTime(record.odjezd);
  let isWeekendInRange = false;
  if (arrivalDateForWeekendCheck && departureDateForWeekendCheck && arrivalDateForWeekendCheck < departureDateForWeekendCheck) {
    isWeekendInRange = isRangeOverlappingWeekend(arrivalDateForWeekendCheck, departureDateForWeekendCheck);
  }

  let baseRowClass = "bg-white"; 
  if (record.cas === "Chyba data" || record.cas === "Neplatný vstup") {
    baseRowClass = "bg-red-50"; 
  }
  
  let conditionalRowClass = baseRowClass;
  if (record.isNew) {
    conditionalRowClass = "bg-sky-50 hover:bg-sky-100"; // Special highlight for new, unsorted rows
  } else if (isWeekendInRange) {
    conditionalRowClass = "weekend-row"; // Uses CSS defined in index.html
  }


  const rowClasses = [
    conditionalRowClass,
    'transition-colors duration-150 ease-in-out'
  ].join(' ');


  return (
    <tr className={rowClasses}>
      <td className={`${cellClass} whitespace-nowrap`}>
        {isEditing ? (
          <input type="text" name="prijzed" value={editData.prijzed} onChange={handleChange} className={inputClass} placeholder="DD.MM.RR HH:MM" />
        ) : (
          record.prijzed
        )}
      </td>
      <td className={`${cellClass} whitespace-nowrap`}>{dayOfWeek}</td>
      <td className={`${cellClass} whitespace-nowrap`}>
        {isEditing ? (
          <input type="text" name="odjezd" value={editData.odjezd} onChange={handleChange} className={inputClass} placeholder="DD.MM.RR HH:MM" />
        ) : (
          record.odjezd
        )}
      </td>
      <td className={cellClass}>
        {isEditing ? (
          <input type="text" name="zeme" value={editData.zeme} onChange={handleChange} className={inputClass} />
        ) : (
          record.zeme
        )}
      </td>
      <td className={`${cellClass} font-medium whitespace-nowrap ${record.cas === "Chyba data" || record.cas === "Neplatný vstup" ? "text-red-600" : "text-slate-800"}`}>{record.cas}</td>
      <td className={`${cellClass} text-right`}>
        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-800 transition-colors duration-150 rounded-full hover:bg-green-100" title="Uložit záznam">
                <SaveIcon className="w-5 h-5" />
              </button>
              <button onClick={handleCancel} className="p-1.5 text-slate-500 hover:text-slate-700 transition-colors duration-150 rounded-full hover:bg-slate-200" title="Zrušit úpravy">
                <CancelIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={handleEditToggle} className="p-1.5 text-sky-600 hover:text-sky-800 transition-colors duration-150 rounded-full hover:bg-sky-100" title="Upravit záznam">
              <EditIcon className="w-5 h-5" />
            </button>
          )}
           <button onClick={() => onAddRecordRelative(record.id, true)} className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors duration-150 rounded-full hover:bg-blue-100" title="Přidat řádek nad">
             <ArrowUpIcon className="w-5 h-5" />
           </button>
           <button onClick={() => onAddRecordRelative(record.id, false)} className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors duration-150 rounded-full hover:bg-blue-100" title="Přidat řádek pod">
             <ArrowDownIcon className="w-5 h-5" />
           </button>
          <button onClick={() => onDeleteRecord(record.id)} className="p-1.5 text-red-500 hover:text-red-700 transition-colors duration-150 rounded-full hover:bg-red-100" title="Smazat záznam">
            <DeleteIcon className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TableRow;
