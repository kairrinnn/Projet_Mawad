import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Exporte des données vers un fichier PDF.
 */
export const exportToPDF = ({
  filename,
  title,
  headers,
  data,
  orientation = "p",
}: {
  filename: string;
  title: string;
  headers: string[];
  data: Array<Array<string | number>>;
  orientation?: "p" | "l";
}) => {
  const doc = new jsPDF(orientation, "mm", "a4");
  
  // Titre
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Date d'export
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le: ${new Date().toLocaleString("fr-FR")}`, 14, 30);

  // Tableau
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600 inspired
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Exporte des données vers un fichier Excel.
 */
export const exportToExcel = ({
  filename,
  data,
  sheetName = "Sheet1",
}: {
  filename: string;
  data: Array<Record<string, string | number>>;
  sheetName?: string;
}) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
