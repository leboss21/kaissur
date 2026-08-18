export interface CityOption {
  value: string;
  label: string;
  subLabel: string;
  badge: string;
}

export const WORLD_CITIES: CityOption[] = [
  // Afrique de l'Ouest & Centrale
  { value: 'Lomé (LFW)', label: 'Lomé', subLabel: 'Togo — Aéroport Gnassingbé Eyadéma', badge: 'LFW' },
  { value: 'Cotonou (COO)', label: 'Cotonou', subLabel: 'Bénin — Aéroport Cardinal Bernadin Gantin', badge: 'COO' },
  { value: 'Abidjan (ABJ)', label: 'Abidjan', subLabel: 'Côte d\'Ivoire — Aéroport Félix-Houphouët-Boigny', badge: 'ABJ' },
  { value: 'Dakar (DSS)', label: 'Dakar', subLabel: 'Sénégal — Aéroport Blaise Diagne', badge: 'DSS' },
  { value: 'Accra (ACC)', label: 'Accra', subLabel: 'Ghana — Aéroport Kotoka', badge: 'ACC' },
  { value: 'Ouagadougou (OUA)', label: 'Ouagadougou', subLabel: 'Burkina Faso — Aéroport de Ouagadougou', badge: 'OUA' },
  { value: 'Bamako (BKO)', label: 'Bamako', subLabel: 'Mali — Aéroport Modibo Keïta', badge: 'BKO' },
  { value: 'Niamey (NIM)', label: 'Niamey', subLabel: 'Niger — Aéroport Diori Hamani', badge: 'NIM' },
  { value: 'Lagos (LOS)', label: 'Lagos', subLabel: 'Nigeria — Aéroport Murtala Muhammed', badge: 'LOS' },
  { value: 'Abuja (ABV)', label: 'Abuja', subLabel: 'Nigeria — Aéroport Nnamdi Azikiwe', badge: 'ABV' },
  { value: 'Douala (DLA)', label: 'Douala', subLabel: 'Cameroun — Aéroport International de Douala', badge: 'DLA' },
  { value: 'Yaoundé (NSI)', label: 'Yaoundé', subLabel: 'Cameroun — Aéroport de Yaoundé-Nsimalen', badge: 'NSI' },
  { value: 'Libreville (LBV)', label: 'Libreville', subLabel: 'Gabon — Aéroport Léon-Mba', badge: 'LBV' },
  { value: 'Brazzaville (BZV)', label: 'Brazzaville', subLabel: 'Congo — Aéroport Maya-Maya', badge: 'BZV' },
  { value: 'Pointe-Noire (PNR)', label: 'Pointe-Noire', subLabel: 'Congo — Aéroport Antonio-Agostinho-Neto', badge: 'PNR' },
  { value: 'Kinshasa (FIH)', label: 'Kinshasa', subLabel: 'RDC — Aéroport International de N\'djili', badge: 'FIH' },
  { value: 'Conakry (CKY)', label: 'Conakry', subLabel: 'Guinée — Aéroport Ahmed Sékou Touré', badge: 'CKY' },
  { value: 'Freetown (FNA)', label: 'Freetown', subLabel: 'Sierra Leone — Aéroport Lungi', badge: 'FNA' },
  { value: 'Monrovia (ROB)', label: 'Monrovia', subLabel: 'Libéria — Aéroport Roberts', badge: 'ROB' },
  { value: 'N\'Djamena (NDJ)', label: 'N\'Djamena', subLabel: 'Tchad — Aéroport Hassan Djamous', badge: 'NDJ' },

  // Maghreb & Reste de l'Afrique
  { value: 'Casablanca (CMN)', label: 'Casablanca', subLabel: 'Maroc — Aéroport Mohammed V', badge: 'CMN' },
  { value: 'Marrakech (RAK)', label: 'Marrakech', subLabel: 'Maroc — Aéroport Ménara', badge: 'RAK' },
  { value: 'Tunis (TUN)', label: 'Tunis', subLabel: 'Tunisie — Aéroport Tunis-Carthage', badge: 'TUN' },
  { value: 'Alger (ALG)', label: 'Alger', subLabel: 'Algérie — Aéroport Houari Boumédiène', badge: 'ALG' },
  { value: 'Le Caire (CAI)', label: 'Le Caire', subLabel: 'Égypte — Aéroport International du Caire', badge: 'CAI' },
  { value: 'Addis-Abeba (ADD)', label: 'Addis-Abeba', subLabel: 'Éthiopie — Aéroport Bole', badge: 'ADD' },
  { value: 'Nairobi (NBO)', label: 'Nairobi', subLabel: 'Kenya — Aéroport Jomo Kenyatta', badge: 'NBO' },
  { value: 'Johannesburg (JNB)', label: 'Johannesburg', subLabel: 'Afrique du Sud — Aéroport O.R. Tambo', badge: 'JNB' },
  { value: 'Le Cap (CPT)', label: 'Le Cap', subLabel: 'Afrique du Sud — Aéroport International du Cap', badge: 'CPT' },

  // Europe
  { value: 'Paris (CDG)', label: 'Paris Charles de Gaulle', subLabel: 'France — Aéroport Roissy CDG', badge: 'CDG' },
  { value: 'Paris Orly (ORY)', label: 'Paris Orly', subLabel: 'France — Aéroport d\'Orly', badge: 'ORY' },
  { value: 'Lyon (LYS)', label: 'Lyon', subLabel: 'France — Aéroport Saint-Exupéry', badge: 'LYS' },
  { value: 'Marseille (MRS)', label: 'Marseille', subLabel: 'France — Aéroport Provence', badge: 'MRS' },
  { value: 'Bruxelles (BRU)', label: 'Bruxelles', subLabel: 'Belgique — Aéroport de Bruxelles-National', badge: 'BRU' },
  { value: 'Genève (GVA)', label: 'Genève', subLabel: 'Suisse — Aéroport International de Genève', badge: 'GVA' },
  { value: 'Londres (LHR)', label: 'Londres Heathrow', subLabel: 'Royaume-Uni — Aéroport Heathrow', badge: 'LHR' },
  { value: 'Londres Gatwick (LGW)', label: 'Londres Gatwick', subLabel: 'Royaume-Uni — Aéroport Gatwick', badge: 'LGW' },
  { value: 'Francfort (FRA)', label: 'Francfort', subLabel: 'Allemagne — Aéroport de Francfort', badge: 'FRA' },
  { value: 'Munich (MUC)', label: 'Munich', subLabel: 'Allemagne — Aéroport Franz-Josef-Strauss', badge: 'MUC' },
  { value: 'Amsterdam (AMS)', label: 'Amsterdam', subLabel: 'Pays-Bas — Aéroport Schiphol', badge: 'AMS' },
  { value: 'Madrid (MAD)', label: 'Madrid', subLabel: 'Espagne — Aéroport Barajas', badge: 'MAD' },
  { value: 'Barcelone (BCN)', label: 'Barcelone', subLabel: 'Espagne — Aéroport El Prat', badge: 'BCN' },
  { value: 'Lisbonne (LIS)', label: 'Lisbonne', subLabel: 'Portugal — Aéroport Humberto Delgado', badge: 'LIS' },
  { value: 'Rome (FCO)', label: 'Rome', subLabel: 'Italie — Aéroport Fiumicino', badge: 'FCO' },
  { value: 'Milan (MXP)', label: 'Milan', subLabel: 'Italie — Aéroport Malpensa', badge: 'MXP' },
  { value: 'Istanbul (IST)', label: 'Istanbul', subLabel: 'Turquie — Aéroport d\'Istanbul', badge: 'IST' },

  // Moyen-Orient & Asie
  { value: 'Dubaï (DXB)', label: 'Dubaï', subLabel: 'Émirats Arabes Unis — Aéroport International de Dubaï', badge: 'DXB' },
  { value: 'Abou Dabi (AUH)', label: 'Abou Dabi', subLabel: 'Émirats Arabes Unis — Aéroport Zayed', badge: 'AUH' },
  { value: 'Doha (DOH)', label: 'Doha', subLabel: 'Qatar — Aéroport International Hamad', badge: 'DOH' },
  { value: 'Riyad (RUH)', label: 'Riyad', subLabel: 'Arabie Saoudite — Aéroport King Khalid', badge: 'RUH' },
  { value: 'Djeddah (JED)', label: 'Djeddah', subLabel: 'Arabie Saoudite — Aéroport King Abdulaziz', badge: 'JED' },
  { value: 'Pékin (PEK)', label: 'Pékin', subLabel: 'Chine — Aéroport International de Pékin', badge: 'PEK' },
  { value: 'Guangzhou (CAN)', label: 'Guangzhou / Canton', subLabel: 'Chine — Aéroport Baiyun', badge: 'CAN' },
  { value: 'Shanghai (PVG)', label: 'Shanghai', subLabel: 'Chine — Aéroport Pudong', badge: 'PVG' },
  { value: 'Mumbai (BOM)', label: 'Mumbai / Bombay', subLabel: 'Inde — Aéroport Chhatrapati Shivaji', badge: 'BOM' },
  { value: 'New Delhi (DEL)', label: 'New Delhi', subLabel: 'Inde — Aéroport Indira Gandhi', badge: 'DEL' },
  { value: 'Tokyo (HND)', label: 'Tokyo', subLabel: 'Japon — Aéroport de Haneda', badge: 'HND' },
  { value: 'Singapour (SIN)', label: 'Singapour', subLabel: 'Singapour — Aéroport Changi', badge: 'SIN' },
  { value: 'Bangkok (BKK)', label: 'Bangkok', subLabel: 'Thaïlande — Aéroport Suvarnabhumi', badge: 'BKK' },

  // Amériques
  { value: 'New York (JFK)', label: 'New York JFK', subLabel: 'États-Unis — John F. Kennedy International', badge: 'JFK' },
  { value: 'Washington (IAD)', label: 'Washington Dulles', subLabel: 'États-Unis — Dulles International', badge: 'IAD' },
  { value: 'Atlanta (ATL)', label: 'Atlanta', subLabel: 'États-Unis — Hartsfield-Jackson', badge: 'ATL' },
  { value: 'Montréal (YUL)', label: 'Montréal', subLabel: 'Canada — Aéroport Pierre-Elliott-Trudeau', badge: 'YUL' },
  { value: 'Toronto (YYZ)', label: 'Toronto', subLabel: 'Canada — Aéroport Pearson', badge: 'YYZ' },
  { value: 'São Paulo (GRU)', label: 'São Paulo', subLabel: 'Brésil — Aéroport Guarulhos', badge: 'GRU' },
];
