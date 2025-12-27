<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="8" md="5">
        <v-card class="elevation-8 rounded-lg">
          <v-card-item class="bg-primary text-white text-center py-8">
            <v-icon size="48" class="mb-2">mdi-account-plus</v-icon>
            <v-card-title class="text-h5">Join Our Community</v-card-title>
            <v-card-subtitle class="text-white-50">Create your account</v-card-subtitle>
          </v-card-item>
          <v-card-text class="pt-8">
            <v-form @submit.prevent="handleRegister">
              <v-text-field
                v-model="username"
                label="Username"
                prepend-inner-icon="mdi-account"
                variant="filled"
                required
                class="mb-6"
              ></v-text-field>
              <v-text-field
                v-model="email"
                label="Email Address"
                type="email"
                prepend-inner-icon="mdi-email"
                variant="filled"
                required
                class="mb-6"
              ></v-text-field>
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                prepend-inner-icon="mdi-lock"
                variant="filled"
                required
                class="mb-6"
              ></v-text-field>
              <v-checkbox
                v-model="termsAccepted"
                label="I accept the Terms and confirm I am over 18"
                required
                class="mb-6"
              ></v-checkbox>
              <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="!termsAccepted" class="mb-4">
                Create Account
              </v-btn>
            </v-form>
            <v-divider class="my-4"></v-divider>
            <div class="text-center">
              <span class="text-grey">Already have an account?</span>
              <router-link to="/login" class="text-primary font-weight-bold">Sign in here</router-link>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/store/ui';

const username = ref('');
const email = ref('');
const password = ref('');
const termsAccepted = ref(false);
const loading = ref(false);
const router = useRouter();
const uiStore = useUiStore();

const handleRegister = async () => {
  loading.value = true;
  try {
    await axios.post('/api/v1/auth/register', {
      username: username.value,
      email: email.value,
      password: password.value
    });
    uiStore.showSuccess('Registration successful! Please check your email to verify your account.');
    router.push('/login');
  } catch (error) {
    uiStore.showError(error.response?.data?.message || 'Registration failed');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.elevation-8 {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.rounded-lg {
  border-radius: 12px;
}
</style>
