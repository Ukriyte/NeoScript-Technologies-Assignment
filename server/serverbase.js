const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

const SECRET = 'TeRcEsSeCrEt';//This should be an environment variable in a real application
const AdminSecret = 'aSdEmCiRnET';

const userSchema = new mongoose.Schema({
  username: {type: String},
  password: String,
  ProductsInCart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

//admin can add products
const adminSchema = new mongoose.Schema({
  username: String,
  password: String
});

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  imageLink: String
});

// Define mongoose models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Product = mongoose.model('Product', ProductSchema);

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

mongoose.connect('mongodb+srv://................//', { useNewUrlParser: true, useUnifiedTopology: true, dbName: "E-cart" });

app.post('/admin/signup', (req, res) => {
  const { username, password } = req.body;
  function callback(admin) {
    if (admin) {
      res.status(403).json({ message: 'Admin already exists' });
    } else {
      const obj = { username: username, password: password };
      const newAdmin = new Admin(obj);
      newAdmin.save();
      const token = jwt.sign({ username, role: 'admin' }, AdminSecret, { expiresIn: '1h' });
      res.json({ message: 'Admin created successfully', token });
    }

  }
  Admin.findOne({ username }).then(callback);
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.headers;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: 'admin' }, AdminSecret, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.post('/admin/products', authenticateJwt, async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json({ message: 'Product added', ProductId: Product.id });
});

app.get('/admin/products', authenticateJwt, async (req, res) => {
  const products = await Product.find({});
  res.json({ products });
});

// User routes

app.post('/users/signup', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user) {
    res.status(403).json({ message: 'User already exists' });
  } else {
    const newUser = new User({ username, password });
    await newUser.save();
    const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'User created successfully', token });
  }
});

app.post('/users/login', async (req, res) => {
  const { username, password } = req.headers;
  const user = await User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.get('/users/products', authenticateJwt, async (req, res) => {
  const products = await Product.find();
  res.json({ products });
});

app.put('/users/products/:productId', authenticateJwt, async (req, res) => {
  const product = await Product.findById(req.params.productId);
  console.log(product);
  if (product) {
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      user.ProductsInCart.push(product);
      await user.save();
      res.json({ message: 'Product added to cart successfully' });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

app.get('/users/cart', authenticateJwt, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }).populate('ProductsInCart');
  if (user) {
    res.json({ Cart: user.ProductsInCart || [] });
  } else {
    res.status(403).json({ message: 'User not found' });
  }
});

app.delete('/users/products/:productId', authenticateJwt, async (req, res) => {
  const product = await Product.findById(req.params.productId);
  console.log(product);
  if (product) {
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      user.ProductsInCart.push(product);
      await user.save();
      res.json({ message: 'Product removed from cart successfully' });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
