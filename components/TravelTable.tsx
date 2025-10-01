import React from 'react';
import { EditableTravelRecord } from '../types';
import TableRow from './TableRow';

interface TravelTableProps {
  records: EditableTravelRecord[];
  onUpdateRecord: (updatedRecord: EditableTravelRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecordRelative: (id: string, above: boolean) => void;
}

const TravelTable: React.FC<TravelTableProps> = ({ records, onUpdateRecord, onDeleteRecord, onAddRecordRelative }) => {
  const tableHeaders = ["Příjezd", "Den v týdnu", "Odjezd", "Země", "Čas", "Akce"];

  return (
    <div className="bg-white shadow-xl rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-700 sticky top-0 z-10">
            <tr>
              {tableHeaders.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-3 py-3.5 text-left text-sm font-semibold text-white ${header === "Akce" ? "text-right" : ""} ${header === "Den v týdnu" ? "whitespace-nowrap" : ""}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length} className="px-6 py-10 text-center text-sm text-slate-500">
                  Žádné záznamy k zobrazení. Přidejte nový záznam nebo nahrajte report.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <TableRow
                  key={record.id}
                  record={record}
                  onUpdateRecord={onUpdateRecord}
                  onDeleteRecord={onDeleteRecord}
                  onAddRecordRelative={onAddRecordRelative}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TravelTable;