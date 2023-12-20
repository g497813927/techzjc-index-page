<script setup>
import {/* webpackPrefetch: true */ ref} from 'vue'

const loading = ref(true);

// Dynamically load the logo into img tag with id "logo"
const logo = ref("");
const img = new Image();
img.src = "//static.techzjc.com/icon/icon-logo-black-no-subtitle.svg";
img.onload = () => {
    logo.value = img.src;
    loading.value = false;
}
// Keeps checking if screen width is less than 768px
// If so, hide the navbar
const width = ref(window.innerWidth);
window.onresize = () => {
  width.value = window.innerWidth;
}

// Collapse the navbar
const collapse = ref(false);
const expand = () => {
  collapse.value = !collapse.value;
}

const language = ref('auto');

import VueScrollTo from 'vue-scrollto';

</script>

<template>
  <lay-menu theme="light" class="header">
    <!-- Add logo here -->
    <lay-menu-item>
      <lay-skeleton :loading="loading" animated>
        <!-- Use //static.techzjc.com/icon/icon-logo-black-no-subtitle.svg as logo -->
        <template #skeleton>
          <lay-skeleton-item type="p"
                             style="width: 20vw; height: 4vh; margin: 1vh -3vw;"/>
        </template>
        <div>
          <a @click="VueScrollTo.scrollTo('#cover', 500, {offset: -50})">
            <img id="logo" style="height: 2vh" alt="Techzjc Logo" :src="logo" class="logo" />
          </a>
        </div>
      </lay-skeleton>
    </lay-menu-item>
    <!-- Check if screen width is larger than 768px -->
    <lay-menu-item v-if="width > 768">
      <a @click="VueScrollTo.scrollTo('#about', 500, {offset: -50})">
        <lay-icon type="layui-icon-about"/>&nbsp;关于Techzjc
      </a>
    </lay-menu-item>
    <lay-menu-item v-if="width > 768">
      <a @click="VueScrollTo.scrollTo('#apps', 500, {offset: -50})">
        <lay-icon type="layui-icon-app"/>&nbsp;应用
      </a>
    </lay-menu-item>
    <!-- Check if screen width is less than 768px -->
    <lay-menu-item v-if="width <= 768" @click="expand" class="right">
      <!-- Show the transition animation -->
      <transition name="fade">
        <lay-icon :class="collapse ?  'layui-icon-up' : 'layui-icon-more'"></lay-icon>
      </transition>
      &nbsp;
      <span v-if="!collapse">展开</span>
      <span v-else>收起</span>
    </lay-menu-item>
  </lay-menu>
  <!-- Case if screen width is less than 768px, show the box with possible options -->
  <lay-transition>
  <div v-if="width <= 768" v-show="collapse" class="header-box">
    <lay-menu theme="light" :tree="true" class="header-box layui-anim layui-anim-downbit">
      <lay-menu-item>
        <a @click="VueScrollTo.scrollTo('#about', 500, {offset: -50})">
          <lay-icon type="layui-icon-about"/>&nbsp;关于Techzjc
        </a>
      </lay-menu-item>
      <lay-menu-item>
        <a @click="VueScrollTo.scrollTo('#apps', 500, {offset: -50})">
          <lay-icon type="layui-icon-app"/>&nbsp;应用
        </a>
      </lay-menu-item>
    </lay-menu>
  </div>
  </lay-transition>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
}

.header-box {
  position: fixed;
  top: 4vh;
  left: 0;
  width: 100%;
  padding-left: 2vw;
  padding-top: 4vh;
  z-index: 99;
}

#logo {
  height: 2vh;
}

.right {
  float: right;
}

</style>