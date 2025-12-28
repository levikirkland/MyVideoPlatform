<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="9">
        <div class="d-flex flex-wrap align-center justify-space-between mb-6 gap-4">
          <div>
            <h1 class="text-h4 mb-1">Membership</h1>
            <p class="text-body-1 text-grey-lighten-1">
              Unlock every approved video, support creators, and skip waitlists.
            </p>
          </div>
          <v-chip
            :color="membershipStore.isActive ? 'success' : 'warning'"
            variant="tonal"
            size="large"
            class="text-uppercase font-weight-bold"
          >
            {{ membershipStore.isActive ? 'Active Member' : 'Membership Inactive' }}
          </v-chip>
        </div>

        <v-row>
          <v-col cols="12" md="6">
            <v-card class="mb-6" elevation="2">
              <v-card-title class="d-flex align-center justify-space-between">
                <span>Status</span>
                <v-progress-circular
                  v-if="membershipStore.loading"
                  indeterminate
                  color="primary"
                  size="24"
                />
              </v-card-title>
              <v-card-text>
                <v-alert
                  :type="membershipStore.isActive ? 'success' : 'warning'"
                  variant="tonal"
                  class="mb-4"
                >
                  {{ statusMessage }}
                </v-alert>

                <v-list density="compact" nav>
                  <v-list-item prepend-icon="mdi-calendar-check">
                    <v-list-item-title>Started</v-list-item-title>
                    <v-list-item-subtitle>{{ startDate }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-calendar-alert">
                    <v-list-item-title>Renews</v-list-item-title>
                    <v-list-item-subtitle>{{ endDate }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-credit-card-outline">
                    <v-list-item-title>Provider</v-list-item-title>
                    <v-list-item-subtitle>{{ providerLabel }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
              <v-card-actions class="px-6 pb-6">
                <v-btn
                  color="primary"
                  block
                  :loading="membershipStore.checkoutLoading"
                  @click="handleCheckout"
                >
                  {{ membershipStore.isActive ? 'Renew Membership' : 'Become a Member' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="mb-6" elevation="2">
              <v-card-title>Everything You Unlock</v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item v-for="perk in perks" :key="perk" prepend-icon="mdi-check-circle">
                    <v-list-item-title>{{ perk }}</v-list-item-title>
                  </v-list-item>
                </v-list>
                <v-alert variant="text" type="info" class="mt-4">
                  Membership auto-expires if billing fails. You can re-activate anytime—no hidden fees.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card elevation="1">
          <v-card-title>Need manual access?</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              Creators can grant access to trusted fans even when a video is username-gated. Use the Creator Dashboard to
              whitelist supporters instantly.
            </p>
            <v-btn
              v-if="authStore.user?.role === 'creator'"
              to="/creator/dashboard"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-video-account"
            >
              Go to Creator Dashboard
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useMembershipStore } from '@/store/membership';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';

const membershipStore = useMembershipStore();
const uiStore = useUiStore();
const authStore = useAuthStore();

const perks = [
  'Access to every approved community video',
  'Creator uploads the moment they clear moderation',
  'Voting, commenting, and playlists across the site',
  'Eligibility for manual username grants from creators'
];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const startDate = computed(() => formatDate(membershipStore.membership?.start_date));
const endDate = computed(() => formatDate(membershipStore.membership?.end_date));
const providerLabel = computed(() => membershipStore.membership?.provider || 'Pending');
const statusMessage = computed(() => {
  if (membershipStore.isActive) {
    return 'Thanks for supporting the platform. Enjoy unrestricted streaming!';
  }
  return 'No active membership detected. Start a checkout to unlock the catalog.';
});

const handleCheckout = async () => {
  try {
    const result = await membershipStore.startCheckout();
    if (result?.checkoutUrl) {
      // In dev mode, auto-complete the payment
      if (import.meta.env.DEV && result.providerSubscriptionId) {
        await membershipStore.devComplete(result.providerSubscriptionId);
        uiStore.showSuccess('Membership activated! (dev mode auto-complete)');
      } else {
        window.open(result.checkoutUrl, '_blank', 'noopener');
        uiStore.showInfo('Checkout opened in a new tab. Complete payment to activate.');
      }
    }
  } catch (error) {
    uiStore.showError('Unable to start membership checkout right now.');
  }
};

onMounted(() => {
  membershipStore.fetchStatus();
});
</script>
