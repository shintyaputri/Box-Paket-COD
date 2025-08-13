/**
 * NotificationContext.jsx
 * 
 * Context Provider untuk sistem notifikasi dan toast messages global.
 * Mengelola notifikasi paket, status update, dan pesan feedback untuk pengguna.
 * Terintegrasi dengan packageStatusManager untuk notifikasi real-time.
 * 
 * Fitur utama:
 * - Toast notifications dengan auto-hide dan timer
 * - Notifikasi khusus untuk status paket (overdue, upcoming, success)
 * - Notifikasi prioritas dan akses paket
 * - Error notifications dan general messaging
 * - Queue system untuk multiple notifications
 * - Automatic cleanup dan memory management
 * - Role-based notifications (hanya untuk pengguna 'user')
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { packageStatusManager } from "../services/packageStatusManager";

// Membuat React Context untuk sistem notifikasi
const NotificationContext = createContext();

/**
 * Hook kustom untuk mengakses NotificationContext
 * 
 * Menyediakan akses ke sistem notifikasi dari komponen manapun.
 * Wajib digunakan di dalam NotificationProvider, akan throw error jika tidak.
 * 
 * @returns {Object} Context notifikasi dengan properties:
 *   - notifications: Array notifikasi aktif
 *   - visible: Boolean apakah ada notifikasi yang ditampilkan
 *   - addNotification: Function untuk menambah notifikasi
 *   - removeNotification: Function untuk menghapus notifikasi
 *   - clearAllNotifications: Function untuk menghapus semua notifikasi
 *   - show*Notification: Functions khusus untuk berbagai jenis notifikasi
 * @throws {Error} Jika digunakan di luar NotificationProvider
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  // Throw error jika hook dipanggil di luar NotificationProvider
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

/**
 * NotificationProvider Component
 * 
 * Provider component yang menyediakan sistem notifikasi global.
 * Mengelola queue notifikasi, timer auto-hide, dan integrasi dengan
 * packageStatusManager untuk notifikasi real-time.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components yang akan dibungkus provider
 */
export const NotificationProvider = ({ children }) => {
  // Ambil profil pengguna dari AuthContext untuk role checking
  const { userProfile } = useAuth();
  
  // State untuk array notifikasi yang aktif
  const [notifications, setNotifications] = useState([]);
  
  // State untuk visibility notifikasi (ada yang ditampilkan atau tidak)
  const [visible, setVisible] = useState(false);
  
  // Ref untuk menyimpan timeout IDs untuk auto-hide notifications
  const timeoutRefs = useRef(new Map());
  
  // Ref untuk counter ID notifikasi (auto-increment)
  const notificationId = useRef(0);

  /**
   * Helper function untuk mengecek apakah pengguna memiliki role 'user'
   * 
   * Notifikasi tertentu hanya ditampilkan untuk pengguna dengan role 'user',
   * bukan untuk admin atau pengguna tidak terautentikasi.
   * 
   * @returns {boolean} True jika pengguna memiliki role 'user'
   */
  const isUserRole = () => {
    return userProfile && userProfile.role === "user";
  };

  /**
   * Menambahkan notifikasi baru ke queue
   * 
   * Function core untuk menambahkan notifikasi dengan auto-hide timer.
   * Setiap notifikasi mendapat ID unik dan timestamp untuk tracking.
   * 
   * @param {Object} notification - Object notifikasi
   * @param {string} notification.type - Tipe notifikasi ('success', 'error', 'warning', 'info')
   * @param {string} notification.title - Judul notifikasi
   * @param {string} notification.message - Pesan notifikasi
   * @param {string} [notification.icon] - Icon emoji untuk notifikasi
   * @param {boolean} [notification.autoHide=true] - Apakah notifikasi auto-hide
   * @param {number} [notification.duration=5000] - Durasi tampil dalam ms
   * @param {Array} [notification.actions] - Array action buttons
   * @param {Object} [notification.data] - Data tambahan untuk notifikasi
   * @returns {number} ID notifikasi yang baru dibuat
   */
  const addNotification = (notification) => {
    // Generate ID unik untuk notifikasi
    const id = ++notificationId.current;
    
    // Buat object notifikasi lengkap dengan default values
    const newNotification = {
      id,
      timestamp: Date.now(),
      autoHide: notification.autoHide !== false, // Default true
      duration: notification.duration || 5000,   // Default 5 detik
      ...notification, // Spread properties dari parameter
    };

    // Tambahkan notifikasi ke state array
    setNotifications((prev) => [...prev, newNotification]);
    
    // Set visible true jika ada notifikasi
    setVisible(true);

    // Setup auto-hide timer jika diperlukan
    if (newNotification.autoHide) {
      const timeoutId = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);

      // Simpan timeout ID untuk cleanup nanti
      timeoutRefs.current.set(id, timeoutId);
    }

    return id; // Return ID untuk reference
  };

  /**
   * Menghapus notifikasi berdasarkan ID
   * 
   * Function untuk menghapus notifikasi dari queue dan cleanup timer.
   * Jika tidak ada notifikasi tersisa, set visible menjadi false.
   * 
   * @param {number} id - ID notifikasi yang akan dihapus
   */
  const removeNotification = (id) => {
    // Filter notifikasi untuk menghapus yang sesuai ID
    setNotifications((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      
      // Jika tidak ada notifikasi tersisa, sembunyikan
      if (filtered.length === 0) {
        setVisible(false);
      }
      return filtered;
    });

    // Cleanup timeout jika ada
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);           // Clear timeout
      timeoutRefs.current.delete(id);    // Remove dari Map
    }
  };

  /**
   * Menghapus semua notifikasi sekaligus
   * 
   * Function untuk clear semua notifikasi dan cleanup semua timer.
   * Berguna untuk reset state atau saat user logout.
   */
  const clearAllNotifications = () => {
    // Clear semua timeout yang aktif
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    
    // Clear Map timeout refs
    timeoutRefs.current.clear();
    
    // Reset state notifications
    setNotifications([]);
    setVisible(false);
  };

  /**
   * Notifikasi untuk paket yang sudah dikembalikan (overdue)
   * 
   * Menampilkan notifikasi error ketika paket sudah melewati batas waktu
   * dan dikembalikan oleh sistem. Hanya untuk pengguna dengan role 'user'.
   * 
   * @param {Array} packages - Array paket yang dikembalikan
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPackageOverdueNotification = (packages) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    const count = packages.length;
    
    // Buat pesan berdasarkan jumlah paket
    const message =
      count === 1
        ? `Paket ${packages[0].periodData?.label} sudah dikembalikan!`
        : `${count} paket sudah dikembalikan!`;

    return addNotification({
      type: "error",                // Tipe error karena situasi negatif
      title: "Paket Dikembalikan",
      message,
      icon: "⚠️",               // Icon warning
      actions: [
        {
          label: "Lihat Detail",
          primary: true,
          onPress: () => {
            // Navigation akan di-handle di komponen yang menggunakan
            // context ini dengan mengakses notification.data
          },
        },
      ],
      data: { packages, type: "overdue" }, // Data untuk komponen yang menggunakan
    });
  };

  /**
   * Notifikasi untuk paket yang akan segera dikirim
   * 
   * Menampilkan notifikasi warning untuk paket yang akan dikirim dalam 3 hari.
   * Membantu pengguna mempersiapkan diri untuk pengiriman paket.
   * 
   * @param {Array} packages - Array paket yang akan dikirim
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPackageUpcomingNotification = (packages) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    const count = packages.length;
    
    // Buat pesan berdasarkan jumlah paket
    const message =
      count === 1
        ? `Paket ${packages[0].periodData?.label} akan segera dikirim dalam 3 hari`
        : `${count} paket akan segera dikirim dalam 3 hari`;

    return addNotification({
      type: "warning",              // Tipe warning untuk peringatan
      title: "Paket Akan Dikirim",
      message,
      icon: "⏰",                 // Icon jam untuk timing
      actions: [
        {
          label: "Lihat Detail",
          primary: true,
          onPress: () => {
            // Navigation akan di-handle di komponen yang menggunakan
            // context ini dengan mengakses notification.data
          },
        },
      ],
      data: { packages, type: "upcoming" }, // Data untuk komponen yang menggunakan
    });
  };

  /**
   * Notifikasi sukses untuk paket yang berhasil diambil
   * 
   * Menampilkan notifikasi sukses ketika paket berhasil diambil oleh pengguna.
   * Durasi lebih pendek (3 detik) karena informasi positif.
   * 
   * @param {Object} packageData - Data paket yang berhasil diambil
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPackageSuccessNotification = (packageData) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    return addNotification({
      type: "success",           // Tipe success untuk feedback positif
      title: "Paket Berhasil Diambil",
      message: `Paket ${packageData.periodData?.label} telah berhasil diambil`,
      icon: "✅",              // Icon checkmark
      duration: 3000,          // Durasi lebih pendek untuk pesan positif
      data: { packageData, type: "success" },
    });
  };

  /**
   * Notifikasi untuk update status umum
   * 
   * Function umum untuk menampilkan notifikasi update status dengan
   * tipe yang dapat disesuaikan (info atau success).
   * 
   * @param {string} message - Pesan update yang akan ditampilkan
   * @param {string} [type="info"] - Tipe notifikasi ('info' atau 'success')
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showUpdateNotification = (message, type = "info") => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    return addNotification({
      type,                     // Tipe sesuai parameter
      title: "Status Diperbarui",
      message,
      icon: type === "success" ? "✅" : "ℹ️", // Icon sesuai tipe
      duration: 3000,          // Durasi pendek untuk update
    });
  };

  /**
   * Notifikasi untuk error/kesalahan
   * 
   * Function untuk menampilkan notifikasi error. Tidak dibatasi role
   * karena error bisa terjadi untuk semua pengguna (termasuk admin).
   * 
   * @param {string} message - Pesan error yang akan ditampilkan
   * @param {Error|Object} [error=null] - Object error untuk debugging
   * @returns {number} ID notifikasi
   */
  const showErrorNotification = (message, error = null) => {
    return addNotification({
      type: "error",           // Tipe error
      title: "Error",
      message,
      icon: "❌",             // Icon X untuk error
      duration: 4000,         // Durasi lebih panjang untuk error
      data: { error },        // Simpan error object untuk debugging
    });
  };

  /**
   * Notifikasi untuk prioritas yang berhasil diterapkan
   * 
   * Menampilkan notifikasi sukses ketika pengguna berhasil menerapkan
   * prioritas untuk periode tertentu (fitur premium).
   * 
   * @param {string} priorityLevel - Level prioritas yang diterapkan
   * @param {string} periodLabel - Label periode yang diberi prioritas
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPriorityAppliedNotification = (priorityLevel, periodLabel) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    return addNotification({
      type: "success",         // Tipe success untuk feedback positif
      title: "Prioritas Diterapkan",
      message: `Prioritas ${priorityLevel} berhasil diterapkan untuk ${periodLabel}`,
      icon: "💰",             // Icon uang untuk prioritas premium
      duration: 4000,
      data: { priorityLevel, periodLabel, type: "priority_applied" },
    });
  };

  /**
   * Notifikasi untuk update status prioritas pengguna
   * 
   * Memberitahu pengguna ketika status prioritas mereka berubah
   * (misalnya dari normal ke high priority).
   * 
   * @param {string} newPriority - Status prioritas baru
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPriorityStatusNotification = (newPriority) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    return addNotification({
      type: "info",            // Tipe info untuk informasi status
      title: "Status Prioritas Diperbarui",
      message: `Prioritas Anda sekarang: ${newPriority}`,
      icon: "💰",             // Icon uang untuk prioritas
      duration: 3000,         // Durasi sedang untuk info
      data: { newPriority, type: "priority_updated" },
    });
  };

  /**
   * Notifikasi untuk akses paket yang berhasil
   * 
   * Menampilkan notifikasi ketika pengguna berhasil mengakses paket
   * melalui QR code atau metode akses lainnya.
   * 
   * @param {Object} packageData - Data paket yang diakses
   * @param {string} accessMethod - Metode akses yang digunakan (QR, app, dll)
   * @returns {number|undefined} ID notifikasi atau undefined jika bukan user
   */
  const showPackageAccessNotification = (packageData, accessMethod) => {
    // Hanya tampilkan untuk pengguna dengan role 'user'
    if (!isUserRole()) return;

    const message = `Paket ${packageData.periodData?.label} berhasil diakses via ${accessMethod}`;

    return addNotification({
      type: "success",         // Tipe success untuk akses berhasil
      title: "Akses Paket Berhasil",
      message,
      icon: "💳",             // Icon kartu untuk metode akses
      duration: 4000,
      data: { packageData, accessMethod, type: "package_access" },
    });
  };

  /**
   * Function umum untuk menampilkan notifikasi dengan customisasi lengkap
   * 
   * Function general purpose untuk membuat notifikasi dengan opsi lengkap.
   * Tidak dibatasi role sehingga bisa digunakan untuk semua jenis pengguna.
   * 
   * @param {string} title - Judul notifikasi
   * @param {string} message - Pesan notifikasi
   * @param {string} [type="info"] - Tipe notifikasi
   * @param {Object} [options={}] - Opsi tambahan
   * @param {string} [options.icon] - Icon kustom
   * @param {number} [options.duration] - Durasi tampil kustom
   * @param {Array} [options.actions] - Array action buttons
   * @param {Object} [options.data] - Data tambahan
   * @returns {number} ID notifikasi
   */
  const showGeneralNotification = (
    title,
    message,
    type = "info",
    options = {}
  ) => {
    return addNotification({
      type,
      title,
      message,
      // Icon otomatis berdasarkan tipe atau gunakan custom
      icon:
        options.icon ||
        (type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"),
      duration: options.duration || 4000,  // Default 4 detik
      actions: options.actions,            // Action buttons jika ada
      data: options.data,                  // Data tambahan
    });
  };

  /**
   * useEffect untuk mendengarkan event dari packageStatusManager
   * 
   * Setup listener untuk menerima event real-time dari packageStatusManager
   * dan menampilkan notifikasi yang sesuai. Hanya untuk pengguna dengan role 'user'.
   * 
   * Dependencies: [userProfile?.id, userProfile?.role] - re-setup listener 
   * ketika user berubah atau role berubah
   */
  useEffect(() => {
    // Setup listener untuk event dari packageStatusManager
    const unsubscribe = packageStatusManager.addListener((type, data) => {
      // Hanya proses untuk pengguna dengan role 'user'
      if (!isUserRole()) return;

      // Handle berbagai tipe event
      switch (type) {
        case "packages_overdue":
          // Notifikasi paket overdue hanya untuk user yang bersangkutan
          if (data.userId === userProfile?.id) {
            showPackageOverdueNotification(data.packages);
          }
          break;

        case "packages_upcoming":
          // Notifikasi paket upcoming hanya untuk user yang bersangkutan
          if (data.userId === userProfile?.id) {
            showPackageUpcomingNotification(data.packages);
          }
          break;

        case "user_package_updated":
          // Notifikasi update paket, kecuali yang manual (dari UI)
          if (data.userId === userProfile?.id && data.source !== "manual") {
            showUpdateNotification(
              `Data paket diperbarui (${data.source})`,
              "success"
            );
          }
          break;

        default:
          // Ignore event yang tidak dikenal
          break;
      }
    });

    // Return cleanup function untuk unsubscribe listener
    return unsubscribe;
  }, [userProfile?.id, userProfile?.role]); // Re-run ketika user ID atau role berubah

  /**
   * useEffect untuk cleanup saat component unmount
   * 
   * Membersihkan semua timeout yang aktif untuk mencegah memory leak
   * dan timeout yang berjalan setelah component di-unmount.
   * 
   * Dependencies: [] (hanya dijalankan sekali saat mount dan cleanup saat unmount)
   */
  useEffect(() => {
    // Return cleanup function yang akan dipanggil saat unmount
    return () => {
      // Clear semua timeout yang masih aktif
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []); // Empty dependency array - hanya cleanup saat unmount

  /**
   * Function convenience untuk notifikasi sederhana
   * 
   * Wrapper function untuk showGeneralNotification dengan parameter yang
   * disederhanakan. Otomatis menentukan title berdasarkan tipe.
   * 
   * @param {string} message - Pesan notifikasi
   * @param {string} [type="info"] - Tipe notifikasi
   * @param {string} [title=null] - Title kustom (opsional)
   * @returns {number} ID notifikasi
   */
  const showNotification = (message, type = "info", title = null) => {
    return showGeneralNotification(
      // Tentukan title otomatis berdasarkan tipe jika tidak ada title kustom
      title || (type === "success" ? "Berhasil" : type === "error" ? "Error" : "Info"),
      message,
      type
    );
  };

  // Object value yang akan disediakan oleh context provider
  const value = {
    // State notifications
    notifications,                      // Array notifikasi aktif
    visible,                           // Boolean visibility status
    
    // Core functions
    addNotification,                   // Function untuk menambah notifikasi
    removeNotification,                // Function untuk menghapus notifikasi
    clearAllNotifications,             // Function untuk clear semua notifikasi
    
    // Specialized notification functions
    showPackageOverdueNotification,    // Notifikasi paket overdue
    showPackageUpcomingNotification,   // Notifikasi paket upcoming
    showPackageSuccessNotification,    // Notifikasi paket berhasil diambil
    showUpdateNotification,            // Notifikasi update status
    showErrorNotification,             // Notifikasi error
    showPriorityAppliedNotification,   // Notifikasi prioritas diterapkan
    showPriorityStatusNotification,    // Notifikasi status prioritas berubah
    showPackageAccessNotification,     // Notifikasi akses paket berhasil
    
    // General purpose functions
    showGeneralNotification,           // Function umum dengan opsi lengkap
    showNotification,                  // Function convenience sederhana
  };

  // Return Provider component dengan value context
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
