import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // Global Search
  const searchQuery = ref('');

  // Snackbar state
  const snackbar = ref({
    show: false,
    message: '',
    color: 'success', // success, error, info, warning
    timeout: 3000
  });

  // Dialog state
  const dialog = ref({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null
  });

  // Actions for Snackbar
  const showSnackbar = (message, color = 'success', timeout = 3000) => {
    snackbar.value = {
      show: true,
      message,
      color,
      timeout
    };
  };

  const showError = (message) => showSnackbar(message, 'error');
  const showSuccess = (message) => showSnackbar(message, 'success');
  const showInfo = (message) => showSnackbar(message, 'info');
  const showWarning = (message) => showSnackbar(message, 'warning');

  // Actions for Dialog
  const showDialog = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    return new Promise((resolve) => {
      dialog.value = {
        show: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          dialog.value.show = false;
          resolve(true);
        },
        onCancel: () => {
          dialog.value.show = false;
          resolve(false);
        }
      };
    });
  };

  const confirm = (message, title = 'Confirm Action') => {
    return showDialog({ title, message });
  };

  const alert = (message, title = 'Alert') => {
    return showDialog({ 
      title, 
      message, 
      confirmText: 'OK', 
      cancelText: null // Hide cancel button for alerts
    });
  };

  return {
    snackbar,
    dialog,
    showSnackbar,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    showDialog,
    confirm,
    alert,
    searchQuery
  };
});
