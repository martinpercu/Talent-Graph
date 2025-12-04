export interface Teacher {
  id: string;
  name: string;
  pageMap: { [key: string]: number[] };
  indexSubtext: { [key: string]: string };
  defaultTitle: string;
  doc_path: string;
}
