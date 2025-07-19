export interface ConsoleDetails {
  consoleNumber: string;
  ModelNumber: string;
  SerialNumber: string;
  Brand: string;
  consoleType: string;
  ReleaseDate: string;
  Description: string;
}

export interface HardwareSpecifications {
  processorType: string;
  graphicsCard: string;
  ramSize: string;
  storageCapacity: string;
  connectivity: string;
  consoleModelType: string;
}

export interface MaintenanceStatus {
  AvailableStatus: string;
  Condition: string;
  LastMaintenance: string;
  NextScheduledMaintenance: string;
  MaintenanceNotes: string;
}

export interface PriceAndCost {
  price: string;
  Rentalprice: string;
  Warrantyperiod: string;
  InsuranceStatus: string;
}

export interface AdditionalDetails {
  ListOfSupportedGames: string;
  AccessoriesDetails: string;
}

export interface FormData {
  availablegametype: string;
  vendorId: number | null;
  consoleDetails: ConsoleDetails;
  hardwareSpecifications: HardwareSpecifications;
  maintenanceStatus: MaintenanceStatus;
  priceAndCost: PriceAndCost;
  additionalDetails: AdditionalDetails;
}

export interface AddConsoleFormProps {
  consoleType: string;
}