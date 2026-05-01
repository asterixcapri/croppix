export const engines = [
  { key: 'attention', label: 'Sharp attention', baseUrl: 'http://localhost:3003' },
  { key: 'rekognition', label: 'Rekognition hybrid', baseUrl: 'http://localhost:3004' }
];

export const formats = [
  { key: 'horizontal', label: 'Horizontal', width: 318, height: 200 },
  { key: 'vertical', label: 'Vertical', width: 300, height: 390 },
  { key: 'square', label: 'Square', width: 320, height: 320 },
  { key: 'superwide', label: 'Superwide', width: 480, height: 160 }
];

export const cases = [
  {
    title: 'P1010671',
    type: 'article gallery',
    notes: 'Landscape crop from article gallery.',
    path: 'article/790/gallery/P1010671.jpg'
  },
  {
    title: '2U8E2911-X3',
    type: 'article cover',
    notes: 'Article cover with wide crop.',
    path: 'article/788/cover/2U8E2911-X3.jpg'
  },
  {
    title: 'P1090542-1648x1152',
    type: 'article cover',
    notes: 'Article cover, editorial landscape composition.',
    path: 'article/763/cover/P1090542-1648x1152.jpg'
  },
  {
    title: 'P1160521-1648x1152',
    type: 'article cover',
    notes: 'Article cover, landscape crop.',
    path: 'article/761/cover/P1160521-1648x1152.jpg'
  },
  {
    title: 'Card 41 cover',
    type: 'card cover',
    notes: 'Card cover in a wide ratio.',
    path: 'card/41/cover/1.jpg'
  },
  {
    title: 'Take Me Out Capri',
    type: 'service cover',
    notes: 'Portrait service cover. Good for checking subject centering.',
    path: 'service/2089/cover/take-me-out-capri5v.jpg'
  },
  {
    title: 'Cooking Class Pini Capri',
    type: 'service cover',
    notes: 'Portrait cover with text and people.',
    path: 'service/2699/cover/COOKING%20CLASS%202%20PINI%20CAPRI%20-%20COPERTINA.jpeg'
  },
  {
    title: 'Capri service cover',
    type: 'service cover',
    notes: 'Portrait service cover.',
    path: 'service/2437/cover/capri.jpeg'
  },
  {
    title: 'HPTravel1-t',
    type: 'service cover',
    notes: 'Portrait cover for service landing.',
    path: 'service/1466/cover/HPTravel1-t.jpeg'
  },
  {
    title: 'Monte Solaro chair lift',
    type: 'service gallery',
    notes: 'Vertical scenic gallery image with likely non-human subject.',
    path: 'service/2450/gallery/capri_anacapri_lift_chair_monte_solaro.jpg'
  },
  {
    title: 'IMG-20250507-WA0024',
    type: 'service gallery',
    notes: 'Vertical gallery crop.',
    path: 'service/2519/gallery/IMG-20250507-WA0024.jpg'
  },
  {
    title: 'WhatsApp group portrait',
    type: 'service gallery',
    notes: 'Good sanity check for multi-person detection in a tight portrait ratio.',
    path: 'service/2517/gallery/Immagine%20WhatsApp%202024-09-30%20ore%2019.14.41_3104ccd1.jpg'
  }
];
