
export interface Course {
  id: string;
  name?: string;
  title: string;
  teacherId: string; // Referencia al teacher
  teacherName?: string; // Referencia al name del teacher
  enabled?: boolean;
  startDate?: string; // ISO string, ej. "2025-05-01"
  endDate?: string; // ISO string, ej. "2025-12-31"
  description?: string; // Opcional
  difficulty: number; // 1 to 5 ==> 1 easy 5 hardest
}
