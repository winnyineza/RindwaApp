import { useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'rw';

export interface Translations {
  // Navigation
  dashboard: string;
  organizations: string;
  stations: string;
  incidents: string;
  users: string;
  invitations: string;
  profile: string;
  
  // Common actions
  create: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  submit: string;
  send: string;
  logout: string;
  
  // User management
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  active: string;
  inactive: string;
  
  // Roles
  mainAdmin: string;
  superAdmin: string;
  stationAdmin: string;
  stationStaff: string;
  
  // Incident management
  title: string;
  description: string;
  priority: string;
  location: string;
  assignedTo: string;
  createdAt: string;
  
  // Priorities
  low: string;
  medium: string;
  high: string;
  critical: string;
  
  // Status
  pending: string;
  assigned: string;
  inProgress: string;
  resolved: string;
  escalated: string;
  
  // Messages
  welcome: string;
  invitationSent: string;
  userCreated: string;
  loginSuccess: string;
  logoutSuccess: string;
  
  // Placeholders
  enterEmail: string;
  enterPassword: string;
  selectRole: string;
  selectOrganization: string;
  selectStation: string;
  
  // Titles
  sendInvitation: string;
  createNewUser: string;
  userManagement: string;
  systemAnalytics: string;
  stationManagement: string;
  incidentReporting: string;
  
  // Pages and sections
  myAssignedIncidents: string;
  assignedIncidents: string;
  incidentHistory: string;
  systemManagement: string;
  organizationManagement: string;
  stationManagementSection: string;
  myWork: string;
  reports: string;
  analytics: string;
  auditLogs: string;
  
  // Dashboard descriptions
  manageOrganizationsDesc: string;
  manageStationsDesc: string;
  manageIncidentsDesc: string;
  viewIncidentsDesc: string;
  
  // Forms and actions
  search: string;
  filter: string;
  actions: string;
  view: string;
  update: string;
  assign: string;
  name: string;
  type: string;
  organization: string;
  station: string;
  
  // Welcome messages
  welcomeBack: string;
  viewProfile: string;
  myAccount: string;
  
  // Time and status
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  all: string;
  
  // Table headers and labels
  dateCreated: string;
  reportedBy: string;
  exportCsv: string;
  noDataFound: string;
  loading: string;
  
  // Form labels
  searchPlaceholder: string;
  filterByStatus: string;
  filterByPriority: string;
  filterByDate: string;
  
  // Messages and confirmations
  confirmDelete: string;
  areYouSure: string;
  deleteConfirmation: string;
  success: string;
  error: string;
  
  // Additional navigation items
  newOrganization: string;
  allOrganizations: string;
  manageOrganizations: string;
  
  // User interface elements
  selectLanguage: string;
  switchTheme: string;
  currentTime: string;
  
  // Migration functionality
  migrateUser: string;
  migrateToStation: string;
  selectTargetStation: string;
  migrationSuccess: string;
  migrationFailed: string;
  confirmMigration: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    organizations: 'Organizations',
    stations: 'Stations',
    incidents: 'Incidents',
    users: 'Users',
    invitations: 'Invitations',
    profile: 'Profile',
    
    // Common actions
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    send: 'Send',
    logout: 'Logout',
    
    // User management
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    password: 'Password',
    role: 'Role',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    
    // Roles
    mainAdmin: 'Main Administrator',
    superAdmin: 'Super Administrator',
    stationAdmin: 'Station Administrator',
    stationStaff: 'Station Staff',
    
    // Incident management
    title: 'Title',
    description: 'Description',
    priority: 'Priority',
    location: 'Location',
    assignedTo: 'Assigned To',
    createdAt: 'Created At',
    
    // Priorities
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
    
    // Status
    pending: 'Pending',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    escalated: 'Escalated',
    
    // Messages
    welcome: 'Welcome to Rindwa Admin',
    invitationSent: 'Invitation sent successfully',
    userCreated: 'User created successfully',
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logged out successfully',
    
    // Placeholders
    enterEmail: 'Enter email address',
    enterPassword: 'Enter password',
    selectRole: 'Select role',
    selectOrganization: 'Select organization',
    selectStation: 'Select station',
    
    // Titles
    sendInvitation: 'Send Invitation',
    createNewUser: 'Create New User',
    userManagement: 'User Management',
    systemAnalytics: 'System Analytics',
    stationManagement: 'Station Management',
    incidentReporting: 'Incident Reporting',
    
    // Pages and sections
    myAssignedIncidents: 'My Assigned Incidents',
    assignedIncidents: 'Assigned Incidents',
    incidentHistory: 'Incident History',
    systemManagement: 'System Management',
    organizationManagement: 'Organization Management',
    stationManagementSection: 'Station Management',
    myWork: 'My Work',
    reports: 'Reports',
    analytics: 'Analytics',
    auditLogs: 'Audit Logs',
    
    // Dashboard descriptions
    manageOrganizationsDesc: 'Manage organizations and system-wide settings',
    manageStationsDesc: 'Manage stations and organization-level operations',
    manageIncidentsDesc: 'Manage and assign incidents to station staff',
    viewIncidentsDesc: 'View and update your assigned incidents',
    
    // Forms and actions
    search: 'Search',
    filter: 'Filter',
    actions: 'Actions',
    view: 'View',
    update: 'Update',
    assign: 'Assign',
    name: 'Name',
    type: 'Type',
    organization: 'Organization',
    station: 'Station',
    
    // Welcome messages
    welcomeBack: 'Welcome back',
    viewProfile: 'View Profile',
    myAccount: 'My Account',
    
    // Time and status
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    all: 'All',
    
    // Table headers and labels
    dateCreated: 'Date Created',
    reportedBy: 'Reported By',
    exportCsv: 'Export CSV',
    noDataFound: 'No data found',
    loading: 'Loading...',
    
    // Form labels
    searchPlaceholder: 'Search incidents...',
    filterByStatus: 'Filter by Status',
    filterByPriority: 'Filter by Priority',
    filterByDate: 'Filter by Date',
    
    // Messages and confirmations
    confirmDelete: 'Confirm Delete',
    areYouSure: 'Are you sure?',
    deleteConfirmation: 'Are you sure you want to delete this organization?',
    success: 'Success',
    error: 'Error',
    
    // Additional navigation items
    newOrganization: 'New Organization',
    allOrganizations: 'All Organizations',
    manageOrganizations: 'Create and manage emergency service organizations',
    
    // User interface elements
    selectLanguage: 'Select language',
    switchTheme: 'Switch theme',
    currentTime: 'Current time',
    
    // Migration functionality
    migrateUser: 'Migrate User',
    migrateToStation: 'Migrate to Station',
    selectTargetStation: 'Select target station',
    migrationSuccess: 'User migrated successfully',
    migrationFailed: 'Failed to migrate user',
    confirmMigration: 'Are you sure you want to migrate this user?',
  },
  
  fr: {
    // Navigation
    dashboard: 'Tableau de Bord',
    organizations: 'Organisations',
    stations: 'Stations',
    incidents: 'Incidents',
    users: 'Utilisateurs',
    invitations: 'Invitations',
    profile: 'Profil',
    
    // Common actions
    create: 'Créer',
    edit: 'Modifier',
    delete: 'Supprimer',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    submit: 'Soumettre',
    send: 'Envoyer',
    logout: 'Déconnexion',
    
    // User management
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    password: 'Mot de passe',
    role: 'Rôle',
    status: 'Statut',
    active: 'Actif',
    inactive: 'Inactif',
    
    // Roles
    mainAdmin: 'Administrateur Principal',
    superAdmin: 'Super Administrateur',
    stationAdmin: 'Administrateur de Station',
    stationStaff: 'Personnel de Station',
    
    // Incident management
    title: 'Titre',
    description: 'Description',
    priority: 'Priorité',
    location: 'Lieu',
    assignedTo: 'Assigné à',
    createdAt: 'Créé le',
    
    // Priorities
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    critical: 'Critique',
    
    // Status
    pending: 'En attente',
    assigned: 'Assigné',
    inProgress: 'En cours',
    resolved: 'Résolu',
    escalated: 'Escaladé',
    
    // Messages
    welcome: 'Bienvenue dans Rindwa Admin',
    invitationSent: 'Invitation envoyée avec succès',
    userCreated: 'Utilisateur créé avec succès',
    loginSuccess: 'Connexion réussie',
    logoutSuccess: 'Déconnexion réussie',
    
    // Placeholders
    enterEmail: 'Entrez l\'adresse email',
    enterPassword: 'Entrez le mot de passe',
    selectRole: 'Sélectionnez le rôle',
    selectOrganization: 'Sélectionnez l\'organisation',
    selectStation: 'Sélectionnez la station',
    
    // Titles
    sendInvitation: 'Envoyer une Invitation',
    createNewUser: 'Créer un Nouvel Utilisateur',
    userManagement: 'Gestion des Utilisateurs',
    systemAnalytics: 'Analyses du Système',
    stationManagement: 'Gestion des Stations',
    incidentReporting: 'Rapport d\'Incident',
    
    // Pages and sections
    myAssignedIncidents: 'Mes Incidents Assignés',
    assignedIncidents: 'Incidents Assignés',
    incidentHistory: 'Historique des Incidents',
    systemManagement: 'Gestion du Système',
    organizationManagement: 'Gestion des Organisations',
    stationManagementSection: 'Gestion des Stations',
    myWork: 'Mon Travail',
    reports: 'Rapports',
    analytics: 'Analyses',
    auditLogs: 'Journaux d\'Audit',
    
    // Dashboard descriptions
    manageOrganizationsDesc: 'Gérer les organisations et les paramètres système',
    manageStationsDesc: 'Gérer les stations et les opérations organisationnelles',
    manageIncidentsDesc: 'Gérer et assigner les incidents au personnel de station',
    viewIncidentsDesc: 'Voir et mettre à jour vos incidents assignés',
    
    // Forms and actions
    search: 'Rechercher',
    filter: 'Filtrer',
    actions: 'Actions',
    view: 'Voir',
    update: 'Mettre à jour',
    assign: 'Assigner',
    name: 'Nom',
    type: 'Type',
    organization: 'Organisation',
    station: 'Station',
    
    // Welcome messages
    welcomeBack: 'Bienvenue',
    viewProfile: 'Voir le Profil',
    myAccount: 'Mon Compte',
    
    // Time and status
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette Semaine',
    thisMonth: 'Ce Mois',
    all: 'Tous',
    
    // Table headers and labels
    dateCreated: 'Date de Création',
    reportedBy: 'Rapporté par',
    exportCsv: 'Exporter CSV',
    noDataFound: 'Aucune donnée trouvée',
    loading: 'Chargement...',
    
    // Form labels
    searchPlaceholder: 'Rechercher des incidents...',
    filterByStatus: 'Filtrer par Statut',
    filterByPriority: 'Filtrer par Priorité',
    filterByDate: 'Filtrer par Date',
    
    // Messages and confirmations
    confirmDelete: 'Confirmer la Suppression',
    areYouSure: 'Êtes-vous sûr?',
    deleteConfirmation: 'Êtes-vous sûr de vouloir supprimer cette organisation?',
    success: 'Succès',
    error: 'Erreur',
    
    // Additional navigation items
    newOrganization: 'Nouvelle Organisation',
    allOrganizations: 'Toutes les Organisations',
    manageOrganizations: 'Créer et gérer les organisations de services d\'urgence',
    
    // User interface elements
    selectLanguage: 'Sélectionner la langue',
    switchTheme: 'Changer le thème',
    currentTime: 'Heure actuelle',
    
    // Migration functionality
    migrateUser: 'Migrer l\'Utilisateur',
    migrateToStation: 'Migrer vers la Station',
    selectTargetStation: 'Sélectionner la station cible',
    migrationSuccess: 'Utilisateur migré avec succès',
    migrationFailed: 'Échec de la migration de l\'utilisateur',
    confirmMigration: 'Êtes-vous sûr de vouloir migrer cet utilisateur?',
  },
  
  rw: {
    // Navigation
    dashboard: 'Ibikoresho',
    organizations: 'Imiryango',
    stations: 'Sitasiyo',
    incidents: 'Impanuka',
    users: 'Abakoresha',
    invitations: 'Ubutumire',
    profile: 'Imyirondoro',
    
    // Common actions
    create: 'Kurema',
    edit: 'Guhindura',
    delete: 'Gusiba',
    save: 'Kubika',
    cancel: 'Kureka',
    submit: 'Kohereza',
    send: 'Kohereza',
    logout: 'Gusohoka',
    
    // User management
    firstName: 'Izina rya Mbere',
    lastName: 'Izina rya Nyuma',
    email: 'Imeyili',
    phone: 'Telefone',
    password: 'Ijambo ry\'Ibanga',
    role: 'Uruhare',
    status: 'Uko bimeze',
    active: 'Birakora',
    inactive: 'Ntibikora',
    
    // Roles
    mainAdmin: 'Umuyobozi Mukuru',
    superAdmin: 'Umuyobozi Ukomeye',
    stationAdmin: 'Umuyobozi wa Sitasiyo',
    stationStaff: 'Umukozi wa Sitasiyo',
    
    // Incident management
    title: 'Umutwe',
    description: 'Ibisobanuro',
    priority: 'Ibanze',
    location: 'Ahantu',
    assignedTo: 'Byahawe',
    createdAt: 'Byaremwe kuwa',
    
    // Priorities
    low: 'Bike',
    medium: 'Hagati',
    high: 'Byinshi',
    critical: 'Byihutirwa',
    
    // Status
    pending: 'Bitegereje',
    assigned: 'Byahawe',
    inProgress: 'Biragenda',
    resolved: 'Byakemutse',
    escalated: 'Byimukiye',
    
    // Messages
    welcome: 'Murakaza neza muri Rindwa Admin',
    invitationSent: 'Ubutumire bwoherejwe neza',
    userCreated: 'Umukoresha yaremwe neza',
    loginSuccess: 'Kwinjira byagenze neza',
    logoutSuccess: 'Gusohoka byagenze neza',
    
    // Placeholders
    enterEmail: 'Andika aderesi ya imeyili',
    enterPassword: 'Andika ijambo ry\'ibanga',
    selectRole: 'Hitamo uruhare',
    selectOrganization: 'Hitamo umuryango',
    selectStation: 'Hitamo sitasiyo',
    
    // Titles
    sendInvitation: 'Kohereza Ubutumire',
    createNewUser: 'Kurema Umukoresha Mushya',
    userManagement: 'Gucunga Abakoresha',
    systemAnalytics: 'Isesengura rya Sisiteme',
    stationManagement: 'Gucunga Sitasiyo',
    incidentReporting: 'Raporo y\'Impanuka',
    
    // Pages and sections
    myAssignedIncidents: 'Impanuka Zanshyizweho',
    assignedIncidents: 'Impanuka Zashyizweho',
    incidentHistory: 'Amateka y\'Impanuka',
    systemManagement: 'Gucunga Sisiteme',
    organizationManagement: 'Gucunga Imiryango',
    stationManagementSection: 'Gucunga Sitasiyo',
    myWork: 'Akazi Kanjye',
    reports: 'Raporo',
    analytics: 'Isesengura',
    auditLogs: 'Inyandiko z\'Igenzura',
    
    // Dashboard descriptions
    manageOrganizationsDesc: 'Gucunga imiryango n\'igenamiterere rya sisiteme',
    manageStationsDesc: 'Gucunga sitasiyo n\'ibikorwa by\'umuryango',
    manageIncidentsDesc: 'Gucunga no gushyira impanuka ku bakozi ba sitasiyo',
    viewIncidentsDesc: 'Kureba no kuvugurura impanuka washyizweho',
    
    // Forms and actions
    search: 'Gushaka',
    filter: 'Kuyungurura',
    actions: 'Ibikorwa',
    view: 'Kureba',
    update: 'Kuvugurura',
    assign: 'Gushyira',
    name: 'Izina',
    type: 'Ubwoko',
    organization: 'Umuryango',
    station: 'Sitasiyo',
    
    // Welcome messages
    welcomeBack: 'Murakaza neza',
    viewProfile: 'Kureba Imyirondoro',
    myAccount: 'Konti Yanjye',
    
    // Time and status
    today: 'Uyu munsi',
    yesterday: 'Ejo',
    thisWeek: 'Iki cyumweru',
    thisMonth: 'Uku kwezi',
    all: 'Byose',
    
    // Table headers and labels
    dateCreated: 'Itariki yaremwe',
    reportedBy: 'Byatanzwe na',
    exportCsv: 'Gusohora CSV',
    noDataFound: 'Nta makuru abonetse',
    loading: 'Birapakira...',
    
    // Form labels
    searchPlaceholder: 'Gushaka impanuka...',
    filterByStatus: 'Kuyungurura ukurikije uko bimeze',
    filterByPriority: 'Kuyungurura ukurikije ibanze',
    filterByDate: 'Kuyungurura ukurikije itariki',
    
    // Messages and confirmations
    confirmDelete: 'Kwemeza Gusiba',
    areYouSure: 'Urafite ubwoba?',
    deleteConfirmation: 'Urafite ubwoba ko ushaka gusiba uyu muryango?',
    success: 'Byagenze neza',
    error: 'Ikosa',
    
    // Additional navigation items
    newOrganization: 'Umuryango Mushya',
    allOrganizations: 'Imiryango Yose',
    manageOrganizations: 'Kurema no gucunga imiryango y\'ubufasha bw\'ihutirwa',
    
    // User interface elements
    selectLanguage: 'Hitamo ururimi',
    switchTheme: 'Guhindura insanganyamatsiko',
    currentTime: 'Igihe cy\'ubu',
    
    // Migration functionality
    migrateUser: 'Kwimura Umukoresha',
    migrateToStation: 'Kwimura ku Sitasiyo',
    selectTargetStation: 'Hitamo sitasiyo ugamije',
    migrationSuccess: 'Umukoresha yimuriwe neza',
    migrationFailed: 'Kwimura umukoresha byanze',
    confirmMigration: 'Urafite ubwoba ko ushaka kwimura uyu mukoresha?',
  },
};

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('rindwa-language');
    return (stored as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('rindwa-language', language);
  }, [language]);

  const t = (key: keyof Translations): string => {
    return translations[language][key] || key;
  };

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  return { t, language, changeLanguage };
};