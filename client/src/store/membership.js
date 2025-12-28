import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from '@/plugins/axios';

export const useMembershipStore = defineStore('membership', () => {
  const membership = ref(null);
  const isActive = ref(false);
  const loading = ref(false);
  const checkoutLoading = ref(false);

  const hasMembership = computed(() => isActive.value);

  const fetchStatus = async () => {
    loading.value = true;
    try {
      const { data } = await axios.get('/membership/status');
      membership.value = data.membership;
      isActive.value = Boolean(data.isActive);
    } catch (error) {
      membership.value = null;
      isActive.value = false;
    } finally {
      loading.value = false;
    }
  };

  const startCheckout = async () => {
    checkoutLoading.value = true;
    try {
      const { data } = await axios.post('/membership/checkout');
      membership.value = data.membership;
      isActive.value = false;
      return data;
    } catch (error) {
      throw error;
    } finally {
      checkoutLoading.value = false;
    }
  };

  const devComplete = async (providerSubscriptionId) => {
    checkoutLoading.value = true;
    try {
      const { data } = await axios.post('/membership/dev/complete', {
        provider_subscription_id: providerSubscriptionId
      });
      membership.value = data.membership;
      isActive.value = true;
      return data;
    } catch (error) {
      throw error;
    } finally {
      checkoutLoading.value = false;
    }
  };

  const reset = () => {
    membership.value = null;
    isActive.value = false;
    loading.value = false;
    checkoutLoading.value = false;
  };

  return {
    membership,
    isActive,
    loading,
    checkoutLoading,
    hasMembership,
    fetchStatus,
    startCheckout,
    devComplete,
    reset
  };
});
