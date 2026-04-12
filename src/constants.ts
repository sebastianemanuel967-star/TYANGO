
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

export const toppings: Topping[] = [
  { id: "tajin", emoji: "🌶️", name: "Tajín" },
  { id: "tajin_picante", emoji: "🔥", name: "Tajín Picante" },
  { id: "limon", emoji: "🍋", name: "Limón" },
  { id: "miel", emoji: "🍯", name: "Miel" },
  { id: "gomitas", emoji: "🍬", name: "Gomitas" },
  { id: "takis", emoji: "🌮", name: "Takis" },
];

export const sizes: Record<string, Size> = {
  mini: { label: "Mini", weight: 60, price: 0.6 },
  clasico: { label: "Clásico", weight: 100, price: 1.25 },
  premium: { label: "Premium", weight: 150, price: 1.75 },
};

export const referralCodes: Record<string, number> = {
  TYANGO10: 10,
  AMIGO15: 15,
  PROMO20: 20,
  PRIMERA5: 5,
  FRUTAS10: 10,
  QUITO10: 10,
};

export const testimonials: Testimonial[] = [
  {
    name: "María García",
    role: "Estudiante",
    text: "¡ENCHILATE con TYANGO! La mejor combinación de mango con tajín picante. Adictivo.",
    avatar: "👩‍🎓",
  },
  {
    name: "Carlos López",
    role: "Deportista",
    text: "Perfecto para después del gym. Fruta fresca, saludable y delicioso. ¡Recomendado!",
    avatar: "💪",
  },
  {
    name: "Ana Martínez",
    role: "Emprendedora",
    text: "La mejor opción para un snack rápido en la oficina. Calidad premium a buen precio.",
    avatar: "👩‍💼",
  },
  {
    name: "Diego Rodríguez",
    role: "Influencer",
    text: "¡ENCHILATE! Es la frase perfecta para describir TYANGO. Sabor explosivo.",
    avatar: "🎬",
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
