<script setup>
// Import necessary components for router-link
import /* webpackPrefetch: true */ NavBar from "@/components/NavBar.vue"
import /* webpackPrefetch: true */ Footer from "@/components/Footer.vue"
import /* webpackPrefetch: true */ About from "@/components/About.vue"
import /* webpackPrefetch: true */ Apps from "@/components/Apps.vue"
import /* webpackPrefetch: true */ Cover from "@/components/Cover.vue"
</script>

<template>
  <lay-backtop :circle="true" icon="layui-icon-up"></lay-backtop>
  <NavBar />
  <Cover />
  <!-- Main Content -->
  <About />
  <Apps />
<!--  <lay-skeleton :loading="true" animated :rows="100">-->
<!--  </lay-skeleton>-->
  <!-- Footer -->
  <Footer />
</template>

<style scoped>

</style>
