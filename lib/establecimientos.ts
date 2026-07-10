// Catálogo de establecimientos por ciudad para el popup de configuración del
// kiosko (components/ConfigOculta.tsx). El promotor lo configura una sola vez
// por local; cada registro del formulario guarda ciudad+establecimiento
// automáticamente a partir de esta configuración (ver lib/registro-cliente.ts).

export interface Establecimiento {
  nombre: string;
  direccion: string;
  tipo: string;
}

export interface CiudadEstablecimientos {
  ciudad: string;
  establecimientos: Establecimiento[];
}

export const CIUDADES: CiudadEstablecimientos[] = [
  {
    ciudad: "Santo Domingo",
    establecimientos: [
      { nombre: "EME by Marketcito", direccion: "Av. Gustavo Mejía Ricart", tipo: "Bar" },
      { nombre: "Marketcito", direccion: "Roberto Pastoriza 204 entre Tiradentes y Lope de Vega", tipo: "Bar" },
      { nombre: "La Posta Bar", direccion: "Av. Gustavo Mejía Ricart", tipo: "Bar" },
      { nombre: "Home Liquors (Malecón)", direccion: "Av. 30 de Mayo", tipo: "Liquor Store" },
      { nombre: "Odette", direccion: "Av. Gustavo Mejía Ricart esq. Abrahan L.", tipo: "Bar" },
      { nombre: "Marokana", direccion: "Av. Caonabo #73 Renacimiento", tipo: "Bar & Tapas" },
      { nombre: "Carpe Diem", direccion: "Av. España", tipo: "Bar/Terraza" },
      { nombre: "Maxula Bar", direccion: "Calle Cub Scout Esq. Av. Tiradentes", tipo: "Bar" },
    ],
  },
  {
    ciudad: "Santiago",
    establecimientos: [
      { nombre: "Food Tropolis", direccion: "Av. Juan Pablo Duarte", tipo: "Food Truck Park" },
      { nombre: "Galipote Afterwork", direccion: "Villa Olga, Av. Benito Juárez", tipo: "Bar" },
      { nombre: "La Rue", direccion: "Villa Olga, calle 10 esq. Z, Plaza Pontenova", tipo: "Bar" },
    ],
  },
  {
    ciudad: "La Vega",
    establecimientos: [
      { nombre: "OHLala Exp/Restaurant", direccion: "Av. Imber, La Vega (Imber Mall)", tipo: "Restaurante/Bar" },
    ],
  },
  {
    ciudad: "SFM",
    establecimientos: [
      { nombre: "Glorietta Terrace & Lounge", direccion: "Av. Antonio Guzmán", tipo: "Bar/Terraza" },
    ],
  },
];
