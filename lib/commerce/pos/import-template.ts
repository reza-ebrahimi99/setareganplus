import ExcelJS from "exceljs";

/**
 * Ghalamchi Book POS Excel import template. Header labels match the catalog
 * importer's Persian aliases so auto-mapping picks the right fields.
 */
const TEMPLATE_HEADERS = [
  "کد کتاب",
  "بارکد",
  "نام کتاب",
  "پایه",
  "رشته",
  "نوع کتاب",
  "قیمت فروش",
  "موجودی اولیه",
  "فعال/غیرفعال",
] as const;

const EXAMPLE_ROW = [
  "GH-1001",
  "9786001234567",
  "ریاضی هفتم",
  "هفتم",
  "",
  "آبی",
  "1500000",
  "10",
  "فعال",
];

export async function buildBookPosImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SetareganPlus";
  const sheet = workbook.addWorksheet("کتاب‌ها", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  sheet.addRow([...TEMPLATE_HEADERS]);
  sheet.addRow(EXAMPLE_ROW);

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { horizontal: "right" };
  sheet.columns = TEMPLATE_HEADERS.map(() => ({ width: 18 }));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
