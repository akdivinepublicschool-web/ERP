
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  try {
    const targetDb = process.env.MONGO_DB_NAME || undefined;
    await mongoose.connect(process.env.MONGO_URI, targetDb ? { dbName: targetDb } : {});
    console.log('Connected database:', mongoose.connection.name);

    const email = 'erpadmin@akdivine.com';

    const existing = await User.findOne({ email });

    if (existing) {
      console.log('This email already exists. No changes made.');
      return;
    }

    const user = await User.create({
      name: 'AK Divine ERP Administrator',
      email,
      password: 'AKD!v1ne#Secure2026',
      role: 'admin',
      isActive: true
    });

    console.log('Admin created successfully!');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
