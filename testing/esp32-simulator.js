const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc, getDoc, updateDoc, serverTimestamp, getDocs, query, where } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const inquirer = require('inquirer').default;

const firebaseConfig = {
  apiKey: "AIzaSyA5Lsxqplxa4eQ9H8Zap3e95R_-SFGe2yU",
  authDomain: "alien-outrider-453003-g8.firebaseapp.com",
  projectId: "alien-outrider-453003-g8",
  storageBucket: "alien-outrider-453003-g8.firebasestorage.app",
  messagingSenderId: "398044917472",
  appId: "1:398044917472:web:4ec00f19fafe5523442a85",
  measurementId: "G-J6BPHF1V0Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userCounter = 1;
const CAPACITY_COLLECTION = 'capacity';
const CAPACITY_DOC_ID = 'box_sensor';
const RESI_COLLECTION = 'receipts';

const generateRandomName = () => {
  const firstNames = ['Ahmad', 'Siti', 'Muhammad', 'Fatimah', 'Ali', 'Khadijah', 'Omar', 'Aisha', 'Ibrahim', 'Maryam'];
  const lastNames = ['Rahman', 'Abdullah', 'Hasan', 'Husain', 'Malik', 'Zahra', 'Saleh', 'Noor', 'Yusuf', 'Layla'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
};

const generateRandomPhone = () => {
  const prefixes = ['0812', '0813', '0821', '0822', '0851', '0852'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return `${prefix}${number}`;
};

const generateUserData = async () => {
  let currentCounter = userCounter;
  let success = false;
  
  while (!success) {
    const email = `user${currentCounter}@gmail.com`;
    const password = 'admin123';
    const name = generateRandomName();
    const phone = generateRandomPhone();
    
    try {
      console.log(`\n🔄 Generating user data...`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 Password: ${password}`);
      console.log(`👤 Name: ${name}`);
      console.log(`📱 Phone: ${phone}`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        name: name,
        phone: phone,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ User ${currentCounter} created successfully!`);
      console.log(`🆔 UID: ${user.uid}\n`);
      
      userCounter = currentCounter + 1;
      success = true;
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ Email ${email} already exists, trying next number...`);
        currentCounter++;
      } else {
        console.error(`❌ Failed to create user: ${error.message}\n`);
        break;
      }
    }
  }
  
  // Menu kembali
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Pilih tindakan:',
      choices: [
        { name: '🔙 Kembali ke Menu Utama', value: 'back' }
      ]
    }
  ]);
};

const initializeCapacityData = async (showBackMenu = true) => {
  try {
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const defaultData = {
        height: 0,
        maxHeight: 30,
        lastUpdated: serverTimestamp(),
        deviceId: 'ESP32_001'
      };
      
      await setDoc(docRef, defaultData);
      console.log('✅ Capacity data initialized with default values');
    } else {
      console.log('ℹ️ Capacity data already exists');
    }
    
    // Only show back menu if explicitly requested
    if (showBackMenu) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Pilih tindakan:',
          choices: [
            { name: '🔙 Kembali ke Menu Utama', value: 'back' }
          ]
        }
      ]);
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize capacity data:', error.message);
  }
};

const updateBoxHeight = async (height) => {
  try {
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    await updateDoc(docRef, {
      height: height,
      lastUpdated: serverTimestamp(),
      deviceId: 'ESP32_001'
    });
    
    console.log(`✅ Box height updated to ${height} cm`);
  } catch (error) {
    console.error('❌ Failed to update box height:', error.message);
  }
};

const updateMaxHeight = async (maxHeight) => {
  try {
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    await updateDoc(docRef, {
      maxHeight: maxHeight,
      lastUpdated: serverTimestamp(),
      deviceId: 'ESP32_001'
    });
    
    console.log(`✅ Max height updated to ${maxHeight} cm`);
  } catch (error) {
    console.error('❌ Failed to update max height:', error.message);
  }
};

const getCurrentCapacityData = async () => {
  try {
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('\n📊 Current Capacity Data:');
      console.log(`📏 Current Height: ${data.height} cm`);
      console.log(`📐 Max Height: ${data.maxHeight} cm`);
      console.log(`📱 Device ID: ${data.deviceId}`);
      console.log(`🕐 Last Updated: ${data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleString('id-ID') : 'N/A'}`);
      console.log(`📊 Percentage: ${((data.height / data.maxHeight) * 100).toFixed(1)}%\n`);
    } else {
      console.log('❌ No capacity data found. Please initialize first.\n');
    }
    
    // Menu kembali
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Failed to get capacity data:', error.message);
  }
};

const simulateHeightInput = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'height',
        message: 'Masukkan ketinggian box (cm):',
        validate: (input) => {
          if (input < 0) return 'Ketinggian tidak boleh negatif';
          if (input > 100) return 'Ketinggian terlalu tinggi (max 100cm)';
          return true;
        }
      }
    ]);
    
    await updateBoxHeight(answers.height);
    
    // Menu kembali
    const backMenu = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

const configureMaxHeight = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxHeight',
        message: 'Masukkan ketinggian maksimal box (cm):',
        default: 30,
        validate: (input) => {
          if (input <= 0) return 'Ketinggian maksimal harus lebih dari 0';
          if (input > 100) return 'Ketinggian maksimal terlalu tinggi (max 100cm)';
          return true;
        }
      }
    ]);
    
    await updateMaxHeight(answers.maxHeight);
    
    // Menu kembali
    const backMenu = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

const simulateRandomHeight = async () => {
  try {
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    let maxHeight = 30;
    if (docSnap.exists()) {
      maxHeight = docSnap.data().maxHeight || 30;
    }
    
    const randomHeight = Math.floor(Math.random() * maxHeight);
    await updateBoxHeight(randomHeight);
    
    // Menu kembali
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Fungsi untuk mendapatkan resi berdasarkan status
const getResisByStatus = async (status) => {
  try {
    const q = query(collection(db, RESI_COLLECTION), where('status', '==', status));
    const querySnapshot = await getDocs(q);
    
    const resis = [];
    querySnapshot.forEach((doc) => {
      resis.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return resis;
  } catch (error) {
    console.error('❌ Failed to get resis:', error.message);
    return [];
  }
};

// Simulasi pengantaran paket oleh kurir
const simulatePackageDelivery = async () => {
  try {
    console.log('\n📦 Simulasi Pengantaran Paket Kurir');
    console.log('🔍 Mencari paket dengan status "Sedang Dikirim"...\n');
    
    const resisSedangDikirim = await getResisByStatus('Sedang Dikirim');
    
    if (resisSedangDikirim.length === 0) {
      console.log('❌ Tidak ada paket dengan status "Sedang Dikirim"');
      return;
    }
    
    const choices = resisSedangDikirim.map(resi => ({
      name: `${resi.noResi} - ${resi.nama} (${resi.tipePaket})`,
      value: resi
    }));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedResi',
        message: 'Pilih paket yang akan diantarkan:',
        choices: choices
      }
    ]);
    
    const selectedResi = answers.selectedResi;
    
    // Update status menjadi "Telah Tiba"
    const resiRef = doc(db, RESI_COLLECTION, selectedResi.id);
    await updateDoc(resiRef, {
      status: 'Telah Tiba',
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Paket ${selectedResi.noResi} telah berhasil diantarkan ke box!`);
    console.log(`📊 Status berubah: "Sedang Dikirim" → "Telah Tiba"`);
    
    // Simulasi penambahan ketinggian box (paket masuk ke box)
    if (selectedResi.tipePaket === 'Non-COD') {
      const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentHeight = docSnap.data().height || 0;
        const packageHeight = Math.floor(Math.random() * 5) + 2; // Random height 2-6 cm
        const newHeight = Math.min(currentHeight + packageHeight, docSnap.data().maxHeight || 30);
        
        await updateBoxHeight(newHeight);
        console.log(`📏 Ketinggian box bertambah ${packageHeight} cm (Total: ${newHeight} cm)`);
      }
    }
    
    // Menu kembali
    const backMenu = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error in package delivery simulation:', error.message);
  }
};

// Simulasi pengambilan paket oleh user
const simulatePackagePickup = async () => {
  try {
    console.log('\n📤 Simulasi Pengambilan Paket User');
    console.log('🔍 Mencari paket dengan status "Telah Tiba"...\n');
    
    const resisTelahTiba = await getResisByStatus('Telah Tiba');
    
    if (resisTelahTiba.length === 0) {
      console.log('❌ Tidak ada paket dengan status "Telah Tiba"');
      return;
    }
    
    const choices = resisTelahTiba.map(resi => ({
      name: `${resi.noResi} - ${resi.nama} (${resi.tipePaket})`,
      value: resi
    }));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedResi',
        message: 'Pilih paket yang akan diambil:',
        choices: choices
      }
    ]);
    
    const selectedResi = answers.selectedResi;
    
    // Update status menjadi "Sudah Diambil"
    const resiRef = doc(db, RESI_COLLECTION, selectedResi.id);
    await updateDoc(resiRef, {
      status: 'Sudah Diambil',
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Paket ${selectedResi.noResi} telah berhasil diambil oleh ${selectedResi.nama}!`);
    console.log(`📊 Status berubah: "Telah Tiba" → "Sudah Diambil"`);
    
    // Simulasi pengurangan ketinggian box (paket keluar dari box)
    if (selectedResi.tipePaket === 'Non-COD') {
      const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentHeight = docSnap.data().height || 0;
        const packageHeight = Math.floor(Math.random() * 5) + 2; // Random height 2-6 cm
        const newHeight = Math.max(currentHeight - packageHeight, 0);
        
        await updateBoxHeight(newHeight);
        console.log(`📏 Ketinggian box berkurang ${packageHeight} cm (Total: ${newHeight} cm)`);
      }
    }
    
    // Menu kembali
    const backMenu = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error in package pickup simulation:', error.message);
  }
};

// Fungsi untuk melihat semua resi dengan status
const viewAllResis = async () => {
  try {
    console.log('\n📋 Daftar Semua Resi');
    console.log('='.repeat(50));
    
    const collections = [
      { status: 'Sedang Dikirim', emoji: '🚚' },
      { status: 'Telah Tiba', emoji: '📦' },
      { status: 'Sudah Diambil', emoji: '✅' }
    ];
    
    for (const col of collections) {
      const resis = await getResisByStatus(col.status);
      console.log(`\n${col.emoji} ${col.status} (${resis.length} paket):`);
      
      if (resis.length === 0) {
        console.log('  - Tidak ada paket');
      } else {
        resis.forEach((resi, index) => {
          console.log(`  ${index + 1}. ${resi.noResi} - ${resi.nama} (${resi.tipePaket})`);
        });
      }
    }
    console.log('\n' + '='.repeat(50));
    
    // Menu kembali
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih tindakan:',
        choices: [
          { name: '🔙 Kembali ke Menu Utama', value: 'back' }
        ]
      }
    ]);
    
  } catch (error) {
    console.error('❌ Error viewing resis:', error.message);
  }
};

const showMenu = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Pilih menu:',
        choices: [
          { name: '👤 Generate User Data', value: 'generate' },
          { name: '📊 Lihat Data Kapasitas', value: 'viewCapacity' },
          { name: '📏 Simulasi Ketinggian Manual', value: 'manualHeight' },
          { name: '🎲 Simulasi Ketinggian Random', value: 'randomHeight' },
          { name: '⚙️ Konfigurasi Ketinggian Maksimal', value: 'configMaxHeight' },
          { name: '🔄 Inisialisasi Data Kapasitas', value: 'initCapacity' },
          { name: '📋 Lihat Semua Resi', value: 'viewResis' },
          { name: '🚚 Simulasi Pengantaran Paket (Kurir)', value: 'packageDelivery' },
          { name: '📤 Simulasi Pengambilan Paket (User)', value: 'packagePickup' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);
    
    switch (answers.action) {
      case 'generate':
        await generateUserData();
        await showMenu();
        break;
      case 'viewCapacity':
        await getCurrentCapacityData();
        await showMenu();
        break;
      case 'manualHeight':
        await simulateHeightInput();
        await showMenu();
        break;
      case 'randomHeight':
        await simulateRandomHeight();
        await showMenu();
        break;
      case 'configMaxHeight':
        await configureMaxHeight();
        await showMenu();
        break;
      case 'initCapacity':
        await initializeCapacityData(true); // Show back menu when called from menu
        await showMenu();
        break;
      case 'viewResis':
        await viewAllResis();
        await showMenu();
        break;
      case 'packageDelivery':
        await simulatePackageDelivery();
        await showMenu();
        break;
      case 'packagePickup':
        await simulatePackagePickup();
        await showMenu();
        break;
      case 'exit':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
    }
  } catch (error) {
    if (error.isTtyError) {
      console.log('❌ Prompt couldn\'t be rendered in the current environment');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
};

// Initialize and show menu
const initialize = async () => {
  try {
    console.log('🚀 ESP32 Simulator Started');
    console.log('🔥 Connected to Firebase');
    console.log('📦 Initializing capacity data...\n');
    
    await initializeCapacityData(false); // Don't show back menu during initialization
    console.log(''); // Empty line for better formatting
    await showMenu();
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Start the application
initialize();