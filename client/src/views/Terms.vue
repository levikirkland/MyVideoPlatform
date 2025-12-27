<template>
  <v-container class="py-12">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-h3 font-weight-bold mb-8">Terms of Service</h1>

      <div class="space-y-6">
        <section>
          <h2 class="text-h5 font-weight-bold mb-4">1. Acceptance of Terms</h2>
          <p class="text-body1 mb-4">
            By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2 class="text-h5 font-weight-bold mb-4">2. User Responsibilities</h2>
          <p class="text-body1 mb-4">
            Users are responsible for maintaining the confidentiality of their account information and password. Users agree to accept responsibility for all activities that occur under their account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 class="text-h5 font-weight-bold mb-4">3. Content Standards</h2>
          <p class="text-body1 mb-4">
            Users may not submit content that:
          </p>
          <ul class="list-disc list-inside text-body1 space-y-2 ml-4">
            <li>Violates any law or regulation</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains explicit non-consensual content</li>
            <li>Involves minors in any way</li>
            <li>Constitutes harassment or abuse</li>
          </ul>
        </section>

        <section>
          <h2 class="text-h5 font-weight-bold mb-4">4. Limitation of Liability</h2>
          <p class="text-body1 mb-4">
            This site is provided on an "as is" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2 class="text-h5 font-weight-bold mb-4">5. Termination</h2>
          <p class="text-body1 mb-4">
            We reserve the right to terminate accounts that violate these Terms of Service or engage in behavior we deem inappropriate or harmful to the community.
          </p>
        </section>

        <section>
          <h2 class="text-h5 font-weight-bold mb-4">6. Contact</h2>
          <p class="text-body1">
            For questions about these Terms of Service, please contact our support team.
          </p>
        </section>
      </div>
    </div>
  </v-container>
</template>

<script setup>
</script>

<style scoped>
.max-w-4xl {
  max-width: 56rem;
  margin-left: auto;
  margin-right: auto;
}

.space-y-6 > section + section {
  margin-top: 1.5rem;
}
</style>
