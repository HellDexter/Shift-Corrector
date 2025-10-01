
export interface TravelRecord {
  id: string;
  prijzed: string; // Arrival DD.MM.YY HH:MM
  odjezd: string;  // Departure DD.MM.YY HH:MM
  zeme: string;    // Country
  cas: string;     // Calculated time spent HH:MM:SS
}

export interface EditableTravelRecord extends TravelRecord {
  isEditing?: boolean;
  isNew?: boolean; // Flag to identify a new record that's being added
}
