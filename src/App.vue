<script setup>
// Import necessary components for router-link
import NavBar from "@/components/NavBar.vue"
import Footer from "@/components/Footer.vue"
import About from "@/components/About.vue"
import Apps from "@/components/Apps.vue"
import Cover from "@/components/Cover.vue"
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
