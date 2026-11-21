import type { FrameFinishId, ProductSolution } from '../types/golden';

export const GOLDEN_INTERIORS_ANCHOR = {
  lat: 12.9987655,
  lng: 80.1023541,
};

export const GOLDEN_MAPS_SHORT_URL = 'https://maps.app.goo.gl/hMHk6yZ3MVCnCgeU8';

export const HERO_IMAGE = '/src/assets/images/hero_pleated_door_1795233795654.jpg';

export const FRAME_FINISHES: {
  id: FrameFinishId;
  name: string;
  hex: string;
  swatchHex: string;
  roughness: number;
  metalness: number;
  description: string;
}[] = [
  {
    id: 'champagne',
    name: 'Champagne Gold',
    hex: '#C4A259',
    swatchHex: '#B89448',
    roughness: 0.24,
    metalness: 0.88,
    description: 'Anodized architectural brushed champagne',
  },
  {
    id: 'charcoal',
    name: 'Matte Charcoal',
    hex: '#26282B',
    swatchHex: '#2A2C30',
    roughness: 0.42,
    metalness: 0.55,
    description: 'Powder-coated fine-texture obsidian grey',
  },
  {
    id: 'teak',
    name: 'Warm Teak',
    hex: '#8A5630',
    swatchHex: '#8C5832',
    roughness: 0.52,
    metalness: 0.08,
    description: 'Sublimated timber grain on extruded aluminum',
  },
  {
    id: 'ivory',
    name: 'Architectural Ivory',
    hex: '#EAE6DC',
    swatchHex: '#E5E0D5',
    roughness: 0.36,
    metalness: 0.22,
    description: 'Satin warm white for uPVC & plaster frames',
  },
];

export const PRODUCT_SOLUTIONS: ProductSolution[] = [
  {
    id: 'pleated-door',
    index: '01',
    name: 'Pleated Sliding Mosquito Doors',
    category: 'Insect Screens',
    tagline: 'Retractable accordion mesh for wide balconies & main entries',
    description:
      'Precision-folded UV-stabilized fiberglass and polyester pleated mesh gliding along a low-profile 4mm threshold track. Retracts effortlessly into a slim side cassette when not in use, keeping balconies completely barrier-free.',
    specs: ['4mm Barrier-Free Track', '18x16 Anti-Dust Mesh', 'Custom Up to 16 ft Wide'],
    ratePerSqFtMin: 260,
    ratePerSqFtMax: 340,
    image: '/src/assets/images/product_pleated_mesh_1795233794421.jpg',
    imageAlt: 'Bronze-framed pleated accordion mosquito mesh sliding door on a bright balcony doorway',
    featured: true,
    studioModel: 'pleated',
  },
  {
    id: 'zebra-blinds',
    index: '02',
    name: 'Dual-Layer Zebra & Roller Blinds',
    category: 'Window Blinds',
    tagline: 'Daylight filtering & instant privacy in one fluid pull',
    description:
      'Alternating sheer voile and textured blackout weave bands housed inside a color-matched aluminum cassette pelmet. Engineered for Chennai sunlight with anti-fade fabrics and smooth stainless beaded chain or motorized control.',
    specs: ['UV Heat Reduction', 'Oatmeal / Linen / Blackout', 'Manual or Motorized'],
    ratePerSqFtMin: 185,
    ratePerSqFtMax: 290,
    image: '/src/assets/images/product_zebra_blinds_1795233795752.jpg',
    imageAlt: 'Warm oatmeal dual-layer zebra roller blinds installed across tall living room windows',
    featured: true,
    studioModel: 'zebra',
  },
  {
    id: 'ss316-hinged',
    index: '03',
    name: 'SS 316 Hinged Security Screens',
    category: 'Insect Screens',
    tagline: 'Marine-grade corrosion-proof stainless steel mesh windows',
    description:
      'Built for Chennai coastal humidity and pet-friendly homes. Features 316-grade dark-anodized stainless steel wire woven for unobstructed cross-ventilation, seated in heavy-gauge aluminum frames with multipoint latching.',
    specs: ['Coastal Rust-Proof SS 316', 'Pet & Rodent Resistant', 'Washable High-Airflow'],
    ratePerSqFtMin: 210,
    ratePerSqFtMax: 295,
    image: '/src/assets/images/product_ss_screen_1795233793688.jpg',
    imageAlt: 'Matte charcoal hinged stainless steel 316 insect screen casement window',
    studioModel: 'ss316',
  },
  {
    id: 'balcony-pvc',
    index: '04',
    name: 'Monsoon Balcony PVC & Chick Blinds',
    category: 'Balcony Protection',
    tagline: 'All-weather rain, glare & dust shielding for urban balconies',
    description:
      'Heavy-duty crystal-clear Japanese PVC and UV-treated outdoor sunscreen roll-up blinds with weighted bottom pipes and side guide locks. Transform open apartment balconies into dry, usable lounge spaces year-round.',
    specs: ['1.2mm Crystal PVC', 'Wind-Lock Side Channels', 'Zero-Rust Pulley Hardware'],
    ratePerSqFtMin: 145,
    ratePerSqFtMax: 230,
    image: '/src/assets/images/product_balcony_pvc_1795233794890.jpg',
    imageAlt: 'Clear roll-up weatherproof PVC monsoon blinds enclosing a modern apartment balcony lounge',
  },
  {
    id: 'magnetic-velcro',
    index: '05',
    name: 'Magnetic & Detachable Window Screens',
    category: 'Insect Screens',
    tagline: 'Zero-drill, flush-fitting insect screens for wooden & uPVC windows',
    description:
      'Ultra-neat perimeter magnetic strip system that seals tightly against window frames and peels away in seconds for periodic rinsing. Ideal for rental apartments, bedrooms, and ventilator openings.',
    specs: ['Easy Wash & Re-Snap', 'Fiberglass / SS Options', 'Fast 48-Hr Installation'],
    ratePerSqFtMin: 95,
    ratePerSqFtMax: 155,
    image: '/src/assets/images/product_ss_screen_1795233793688.jpg',
    imageAlt: 'Flush-fitting detachable mosquito window screen with clean architectural border',
    studioModel: 'ss316',
  },
  {
    id: 'vertical-wooden',
    index: '06',
    name: 'Wooden Venetian & Vertical Office Blinds',
    category: 'Window Blinds',
    tagline: 'Architectural slat control for studios, cabins & living rooms',
    description:
      'Precision-tilted basswood, faux-wood moisture-proof Venetian slats, and commercial flame-retardant vertical louvers tailored for executive offices, clinics, and sun-facing bedrooms across Chennai.',
    specs: ['180° Light Angle Tilt', 'Moisture-Safe Faux Wood', 'Commercial Bulk Fit-Outs'],
    ratePerSqFtMin: 165,
    ratePerSqFtMax: 320,
    image: '/src/assets/images/product_zebra_blinds_1795233795752.jpg',
    imageAlt: 'Architectural window blinds casting crisp daylight lines across a modern interior',
    studioModel: 'zebra',
  },
];

export const CHENNAI_QUICK_AREAS = [
  { label: 'Porur', query: 'Porur, Chennai, Tamil Nadu' },
  { label: 'Mangadu', query: 'Mangadu, Chennai, Tamil Nadu' },
  { label: 'Poonamallee', query: 'Poonamallee, Chennai, Tamil Nadu' },
  { label: 'Pallavaram', query: 'Pallavaram, Chennai, Tamil Nadu' },
  { label: 'Anna Nagar', query: 'Anna Nagar, Chennai, Tamil Nadu' },
  { label: 'Velachery', query: 'Velachery, Chennai, Tamil Nadu' },
  { label: 'OMR / Sholinganallur', query: 'Sholinganallur, Chennai, Tamil Nadu' },
];
