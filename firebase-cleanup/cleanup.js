const admin = require("firebase-admin");

let inquirer;
(async () => {
  inquirer = (await import('inquirer')).default;
})();

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const PROTECTED_EMAILS = [
  'admin@gmail.com'
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getAllAuthUsers() {
  const users = [];
  let nextPageToken;
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    users.push(...listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  return users;
}

async function getAllFirestoreUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const users = [];
  snapshot.forEach(doc => {
    users.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return users;
}

async function getAuthUsersToDelete() {
  const allUsers = await getAllAuthUsers();
  return allUsers.filter(user => 
    user.email && !PROTECTED_EMAILS.includes(user.email.toLowerCase())
  );
}

async function getFirestoreUsersToDelete() {
  const allUsers = await getAllFirestoreUsers();
  return allUsers.filter(user => 
    user.email && !PROTECTED_EMAILS.includes(user.email.toLowerCase())
  );
}

async function getAllRelatedData() {
  const firestoreUsers = await getFirestoreUsersToDelete();
  
  const relatedData = {
    users: firestoreUsers
  };
  
  return relatedData;
}

async function showDryRun(deleteOptions) {
  console.log('\n=== DRY RUN MODE ===');
  console.log('Analisis data yang akan dihapus...\n');
  
  const authUsers = deleteOptions.includes('auth') ? await getAuthUsersToDelete() : [];
  const relatedData = deleteOptions.includes('firestore') ? await getAllRelatedData() : null;
  
  if (deleteOptions.includes('auth')) {
    console.log(`📧 AUTH USERS (${authUsers.length}):`);
    if (authUsers.length === 0) {
      console.log('  Tidak ada user auth yang akan dihapus\n');
    } else {
      authUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (UID: ${user.uid})`);
      });
      console.log('');
    }
  }
  
  if (deleteOptions.includes('firestore') && relatedData) {
    console.log(`🗃️  FIRESTORE USERS (${relatedData.users.length}):`);
    if (relatedData.users.length === 0) {
      console.log('  Tidak ada user firestore yang akan dihapus\n');
    } else {
      relatedData.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.name || 'No Name'})`);
      });
      console.log('');
    }
  }
  
  console.log('🛡️  PROTECTED EMAILS:');
  PROTECTED_EMAILS.forEach(email => {
    console.log(`  - ${email}`);
  });
  console.log('');
  
  return { authUsers, relatedData };
}

async function deleteAuthUsers(users) {
  console.log('\n🔥 MENGHAPUS AUTH USERS...');
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      await auth.deleteUser(user.uid);
      successCount++;
      console.log(`✅ ${i + 1}/${users.length} - Deleted: ${user.email}`);
    } catch (error) {
      errorCount++;
      errors.push({ email: user.email, error: error.message });
      console.log(`❌ ${i + 1}/${users.length} - Error: ${user.email}`);
    }
    
    if (i < users.length - 1) {
      await delay(100);
    }
  }
  
  return { successCount, errorCount, errors };
}

async function deleteFirestoreData(relatedData) {
  console.log('\n🗃️  MENGHAPUS FIRESTORE DATA...');
  
  const batch = db.batch();
  let deleteCount = 0;
  
  relatedData.users.forEach(user => {
    const userRef = db.collection('users').doc(user.id);
    batch.delete(userRef);
    deleteCount++;
  });
  
  try {
    await batch.commit();
    console.log(`✅ Berhasil menghapus ${deleteCount} dokumen dari Firestore`);
    return { successCount: deleteCount, errorCount: 0 };
  } catch (error) {
    console.log(`❌ Error menghapus Firestore data: ${error.message}`);
    return { successCount: 0, errorCount: deleteCount };
  }
}

async function handleDryRun() {
  const deleteOptions = ['auth', 'firestore'];
  await showDryRun(deleteOptions);
  console.log('✅ Dry run selesai. Tidak ada data yang dihapus.');
  
  console.log('\nTekan Enter untuk kembali ke menu...');
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: ''
  }]);
}

async function handleDeleteOperation(operation) {
  const deleteOptions = [];
  if (operation === 'auth-only' || operation === 'both') deleteOptions.push('auth');
  if (operation === 'firestore-only' || operation === 'both') deleteOptions.push('firestore');
  
  const { authUsers, relatedData } = await showDryRun(deleteOptions);
  
  const totalItems = (authUsers?.length || 0) + (relatedData?.users?.length || 0);
  
  if (totalItems === 0) {
    console.log('✅ Tidak ada data yang perlu dihapus.');
    console.log('\nTekan Enter untuk kembali ke menu...');
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ''
    }]);
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  PERINGATAN: Operasi ini TIDAK DAPAT DIBATALKAN!');
  console.log('='.repeat(60));
  
  const { confirmDelete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDelete',
      message: `Apakah Anda yakin ingin menghapus ${totalItems} item?`,
      default: false
    }
  ]);
  
  if (!confirmDelete) {
    console.log('Operasi dibatalkan.');
    console.log('\nTekan Enter untuk kembali ke menu...');
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ''
    }]);
    return;
  }
  
  const { finalConfirm } = await inquirer.prompt([
    {
      type: 'input',
      name: 'finalConfirm',
      message: 'Ketik "DELETE" untuk konfirmasi final:',
      validate: (input) => {
        if (input === 'DELETE') return true;
        return 'Anda harus mengetik "DELETE" untuk melanjutkan';
      }
    }
  ]);
  
  console.log('\n🚀 Memulai proses penghapusan...');
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  if (deleteOptions.includes('auth') && authUsers.length > 0) {
    const authResult = await deleteAuthUsers(authUsers);
    totalSuccess += authResult.successCount;
    totalErrors += authResult.errorCount;
  }
  
  if (deleteOptions.includes('firestore') && relatedData) {
    const firestoreResult = await deleteFirestoreData(relatedData);
    totalSuccess += firestoreResult.successCount;
    totalErrors += firestoreResult.errorCount;
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('📊 HASIL AKHIR');
  console.log('='.repeat(40));
  console.log(`✅ Total berhasil: ${totalSuccess}`);
  console.log(`❌ Total error: ${totalErrors}`);
  console.log('='.repeat(40));
  
  console.log('\nTekan Enter untuk kembali ke menu...');
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: ''
  }]);
}

async function showMainMenu() {
  if (!inquirer) {
    inquirer = (await import('inquirer')).default;
  }
  
  console.clear();
  console.log('🔥 Firebase User Cleanup Tool');
  console.log('=============================\n');
  
  const { operation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'operation',
      message: 'Pilih operasi yang ingin dilakukan:',
      choices: [
        { name: '🔍 Dry Run Only (Lihat data saja)', value: 'dry-run' },
        { name: '📧 Hapus Auth Users saja', value: 'auth-only' },
        { name: '🗃️  Hapus Firestore Data saja', value: 'firestore-only' },
        { name: '💥 Hapus Keduanya (Auth + Firestore)', value: 'both' },
        { name: '─────────────────────────', disabled: true },
        { name: '❌ Keluar', value: 'exit' }
      ]
    }
  ]);
  
  return operation;
}

async function main() {
  if (!inquirer) {
    inquirer = (await import('inquirer')).default;
  }
  
  try {
    while (true) {
      const operation = await showMainMenu();
      
      if (operation === 'exit') {
        console.log('\n👋 Terima kasih! Sampai jumpa lagi.');
        break;
      }
      
      if (operation === 'dry-run') {
        await handleDryRun();
      } else {
        await handleDeleteOperation(operation);
      }
    }
  } catch (error) {
    if (error.isTtyError || error.message.includes('User force closed')) {
      console.log('\n\n👋 Program dihentikan oleh user. Sampai jumpa!');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
  
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n\n👋 Program dihentikan oleh user (Ctrl+C). Sampai jumpa!');
  process.exit(0);
});

main().catch(console.error);