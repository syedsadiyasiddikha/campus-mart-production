export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  images: string[];
  seller: string;
  seller_id: string;
  department: string;
  condition: "Like New" | "Good" | "Fair";
  category: string;
  description: string;
  created_at?: string;
  sold?: boolean;
  reserved?: boolean;
  quantity?: number;
};

export const CATEGORIES = [
  { name: "Engineering Books", icon: "BookOpen" },
  { name: "Competitive Exam Books", icon: "GraduationCap" },
  { name: "Scientific Calculators", icon: "Calculator" },
  { name: "Engineering Mini Drafter", icon: "Ruler" },
  { name: "Electronics", icon: "Cpu" },
  { name: "Hostel Essentials", icon: "Lamp" },
  { name: "Stationery", icon: "Pencil" },
];

export const LOST_FOUND: any[] = [];

export const REQUESTS: {
  id: string;
  title: string;
  budget: number;
  description: string;
  by: string;
  dept: string;
}[] = [];

export const NOTIFICATIONS: any[] = [];

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
