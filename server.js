const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'glowyamila-secret';

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta al archivo de datos
const DATA_PATH = path.join(__dirname, 'data', 'products.json');

// Helpers para leer/escribir JSON
function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Configuración de multer para imágenes ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  }
});

// --- Middleware de auth admin ---
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  next();
}

// --- Rutas públicas ---

// Obtener todos los productos activos
app.get('/api/products', (req, res) => {
  const data = readData();
  const activeProducts = data.products.filter(p => p.active);
  res.json(activeProducts);
});

// Obtener un producto por id (solo activos)
app.get('/api/products/:id', (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id, 10);
  const product = data.products.find(p => p.id === id && p.active);

  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  res.json(product);
});

// Obtener productos en oferta
app.get('/api/offers', (req, res) => {
  const data = readData();
  const offers = data.products.filter(p => p.active && p.isOffer);
  res.json(offers);
});

// --- Upload de imágenes (CORREGIDO) ---
app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ninguna imagen' });
  }

  // Guardamos SOLO la ruta relativa (fix definitivo)
  const relativePath = `/uploads/${req.file.filename}`;

  res.status(201).json({
    message: 'Imagen subida correctamente',
    imageUrl: relativePath
  });
});

// --- CRUD ADMIN ---

// Obtener todos los productos (incluye inactivos)
app.get('/api/admin/products', adminAuth, (req, res) => {
  const data = readData();
  res.json(data.products);
});

// Crear producto
app.post('/api/admin/products', adminAuth, (req, res) => {
  const data = readData();
  const {
    name,
    description,
    price,
    imageUrl,
    category,
    isOffer,
    offerPrice,
    active
  } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ message: 'Nombre y precio son obligatorios' });
  }

  const newId =
    data.products.length > 0
      ? Math.max(...data.products.map(p => p.id)) + 1
      : 1;

  const newProduct = {
    id: newId,
    name,
    description: description || '',
    price,
    imageUrl: imageUrl || '',
    category: category || 'General',
    isOffer: !!isOffer,
    offerPrice: isOffer ? (offerPrice || price) : null,
    active: active !== undefined ? active : true
  };

  data.products.push(newProduct);
  writeData(data);

  res.status(201).json(newProduct);
});

// Actualizar producto
app.put('/api/admin/products/:id', adminAuth, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id, 10);
  const index = data.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  const existing = data.products[index];
  const {
    name,
    description,
    price,
    imageUrl,
    category,
    isOffer,
    offerPrice,
    active
  } = req.body;

  const updated = {
    ...existing,
    name: name ?? existing.name,
    description: description ?? existing.description,
    price: price ?? existing.price,
    imageUrl: imageUrl ?? existing.imageUrl,
    category: category ?? existing.category,
    isOffer: isOffer ?? existing.isOffer,
    offerPrice:
      isOffer !== undefined
        ? (isOffer ? (offerPrice || price || existing.price) : null)
        : (offerPrice ?? existing.offerPrice),
    active: active ?? existing.active
  };

  data.products[index] = updated;
  writeData(data);

  res.json(updated);
});

// 🔥 ELIMINAR PRODUCTO (BORRADO REAL)
app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id, 10);

  const exists = data.products.some(p => p.id === id);
  if (!exists) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  data.products = data.products.filter(p => p.id !== id);
  writeData(data);

  res.json({ message: 'Producto eliminado definitivamente' });
});

// --- Manejo de errores de multer ---
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// --- Servidor ---
app.listen(PORT, () => {
  console.log(`GlowYamila backend escuchando en http://localhost:${PORT}`);
});
