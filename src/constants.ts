
export interface Fruit {
  id: string;
  emoji: string;
  name: string;
}

export interface Topping {
  id: string;
  emoji: string;
  name: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar: string;
}

export interface Size {
  label: string;
  price: number;
  weight: number;
  isSoldOut?: boolean;
}

export const fruits: Fruit[] = [
  { id: "mango", emoji: "🥭", name: "Mango" },
  { id: "pina", emoji: "🍍", name: "Piña" },
  { id: "fresa", emoji: "🍓", name: "Fresa" },
  { id: "sandia", emoji: "🍉", name: "Sandía" },
  { id: "pepino", emoji: "🥒", name: "Pepino" },
  { id: "melon", emoji: "🍈", name: "Melón" },
  { id: "manzana", emoji: "🍎", name: "Manzana" },
  { id: "uva", emoji: "🍇", name: "Uva Congelada" },
];

export const fruitColors: Record<string, string> = {
  mango: 'bg-amber-500 border-amber-400 shadow-amber-500/20',
  fresa: 'bg-pink-600 border-pink-400 shadow-pink-500/20',
  sandia: 'bg-green-600 border-green-400 shadow-green-500/20',
  pepino: 'bg-emerald-600 border-emerald-400 shadow-emerald-500/20',
  jicama: 'bg-orange-500 border-orange-400 shadow-orange-500/20',
  pina: 'bg-yellow-500 border-yellow-400 shadow-yellow-500/20',
  melon: 'bg-lime-500 border-lime-400 shadow-lime-500/20',
  manzana: 'bg-red-600 border-red-400 shadow-red-500/20',
  uva: 'bg-indigo-600 border-indigo-400 shadow-indigo-500/20',
};

export const toppings: Topping[] = [
  { id: "tajin", emoji: "🌶️", name: "Tajín" },
  { id: "tajin_picante", emoji: "🔥", name: "Tajín Picante" },
  { id: "limon", emoji: "🍋", name: "Limón" },
  { id: "miel", emoji: "🍯", name: "Miel" },
  { id: "gomitas", emoji: "🍬", name: "Gomitas" },
  { id: "takis", emoji: "🌮", name: "Takis" },
];

export const sizes: Record<string, Size> = {
  mini: { label: "Mini", weight: 155, price: 1.50 },
  clasico: { label: "Clásico", weight: 311, price: 2.50 },
  premium: { label: "Premium", weight: 150, price: 1.75, isSoldOut: true },
};

export const referralCodes: Record<string, number> = {
  TYANGO10: 10,
  AMIGO15: 15,
  PROMO20: 20,
  PRIMERA5: 5,
  FRUTAS10: 10,
  QUITO10: 10,
  OFERTA: 20,
};

export const testimonials: Testimonial[] = [
  {
    name: "María José Terán",
    role: "Cliente Frecuente",
    text: "Me encanta que la fruta siempre llega súper fresca. El mango con bastante tajín y limón es mi snack favorito de todas las tardes.",
    avatar: "👩‍💻",
  },
  {
    name: "Juan Sebastián",
    role: "Deportista",
    text: "El servicio a domicilio en Cumbayá fue increíblemente rápido. El empaque doypack es genial porque mantiene la fruta fría y crujiente.",
    avatar: "🏃‍♂️",
  },
  {
    name: "Valeria Noboa",
    role: "Estudiante",
    text: "Probé el mix de piña y sandía con Takis por curiosidad y ¡wow! No pensé que esa combinación fuera tan adictiva. 10/10.",
    avatar: "🎨",
  },
  {
    name: "Ricardo Espinoza",
    role: "Padre de familia",
    text: "Es la mejor opción para que mis hijos coman fruta sin quejarse. Les encanta el toque de miel y las gomitas. Muy recomendado.",
    avatar: "👨‍👩‍👧‍👦",
  },
];

export const QUITO_NAMES = [
  "Sebas", "Mateo", "Valentina", "Nicolás", "Camila", "Andrés", "Isabella", "Felipe", "Martina", "Lucas", "Daniela", "Joaquín",
  "Alejandra", "Santiago", "Paula", "Gabriel", "Lucía", "Emilio", "Victoria", "Benjamín", "Ximena", "Ricardo", "Elena", "Francisco",
  "Micaela", "Javier", "Sofía", "Diego", "Natalia", "Adrián", "Renata", "Matías"
];

export const QUITO_BARRIOS = [
  "Cumbayá", "La Carolina", "El Condado", "Quitumbe", "Villaflora", "San Rafael", "Tumbaco", "Carcelén", "La Floresta", "Guamaní",
  "Ponciano", "Conocoto", "El Recreo", "Iñaquito", "Nayón", "Puembo"
];
