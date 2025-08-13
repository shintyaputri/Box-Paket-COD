export const updatePackageStatusBasedOnDate = (packageData, currentDate = new Date()) => {
  if (packageData.status === 'picked_up' || packageData.status === 'delivered') {
    return packageData;
  }

  const deliveryDate = new Date(packageData.deliveryDate || currentDate);
  const isOverdue = currentDate > deliveryDate;

  if (isOverdue && packageData.status === 'pending') {
    return {
      ...packageData,
      status: 'returned'
    };
  }

  return packageData;
};

export const calculatePackageProgress = (packages) => {
  const total = packages.length;
  if (total === 0) return 0;

  const completed = packages.filter(p => p.status === 'delivered' || p.status === 'picked_up').length;
  return Math.round((completed / total) * 100);
};

export const getPackageStatusPriority = (status) => {
  const priorities = {
    'returned': 1,
    'pending': 2,
    'delivered': 3,
    'picked_up': 4
  };
  return priorities[status] || 4;
};

export const sortPackagesByStatus = (packages) => {
  return [...packages].sort((a, b) => {
    const priorityA = getPackageStatusPriority(a.status);
    const priorityB = getPackageStatusPriority(b.status);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    const periodA = parseInt(a.periodKey.replace('period_', ''));
    const periodB = parseInt(b.periodKey.replace('period_', ''));
    return periodA - periodB;
  });
};

export const getNextPackageDue = (packages) => {
  const pendingPackages = packages.filter(p => 
    p.status === 'pending' || p.status === 'returned'
  );
  
  if (pendingPackages.length === 0) return null;
  
  return pendingPackages.sort((a, b) => {
    const periodA = parseInt(a.periodKey.replace('period_', ''));
    const periodB = parseInt(b.periodKey.replace('period_', ''));
    return periodA - periodB;
  })[0];
};

export const getPackageStatusColor = (status, colors) => {
  switch (status) {
    case 'delivered':
    case 'picked_up':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'returned':
      return colors.error;
    default:
      return colors.gray500;
  }
};

export const getPackageStatusIcon = (status) => {
  switch (status) {
    case 'delivered':
      return '✅';
    case 'picked_up':
      return '📦';
    case 'pending':
      return '⏳';
    case 'returned':
      return '↩️';
    default:
      return '❓';
  }
};

export const formatPackageWeight = (weight) => {
  return `${weight} kg`;
};

export const formatPackageDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};