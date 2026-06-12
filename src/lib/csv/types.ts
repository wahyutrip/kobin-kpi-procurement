export type RowError = { row: number; field: string; message: string };

export type ParseResult<T> = {
  rows: T[];
  errors: RowError[];
  totalRows: number;
};

export type PoLineInput = {
  prNo: string;
  prDate: string | null;
  prStatus: string | null;
  itemNamePr: string | null;
  requiredQty: number | null;
  requiredDate: string | null;
  requestBy: string | null;
  poNo: string;
  poDate: string;
  lokalImpor: "Lokal" | "Impor";
  poStatus: string | null;
  vendorCode: string | null;
  vendorName: string | null;
  eta: string | null;
  currency: string | null;
  itemNamePo: string;
  qtyPo: number | null;
  uomPo: string | null;
  unitPrice: number | null;
  totalPo: number | null;
  outstandingQty: number | null;
  top: string | null;
  remarks: string | null;
};

export type PrGrLineInput = {
  prNo: string;
  prDate: string;
  itemGroup: string | null;
  itemCode: string;
  itemName: string | null;
  qtyRequested: number | null;
  poNo: string | null;
  poDate: string | null;
  qtyPo: number | null;
  prToPoDays: number | null;
  grpoNo: string | null;
  grpoDate: string | null;
  qtyGrpo: number | null;
  poToGrpoDays: number | null;
};
