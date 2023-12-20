<script setup>
import {/* webpackPrefetch: true */ ref} from 'vue'

const currentYear = new Date().getFullYear()
// const language = ref('auto')
const ICP_NUMBER = ref('浙ICP备2020032105号')

const CHINA_BEI_AN_NUMBER = ref('浙公网安备 33010402004325号')

const CHINA_BEI_AN_REF_URL = ref('http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33010402004325')

</script>

<template>
  <div class="footer">
    <div class="social-media">
      <a href="https://space.bilibili.com/30023942" class="icon"><img
          src="https://static.techzjc.com/icon/icon-bilibili-white.svg" class="icon-img"/></a>
      <a href="https://www.facebook.com/techzjc" class="icon"><img
          src="https://static.techzjc.com/icon/icon-facebook-white.svg" class="icon-img"/></a>
      <a href="https://github.com/g497813927" class="icon"><img
          src="https://static.techzjc.com/icon/icon-GitHub-white.svg" class="icon-img"/></a>
      <a href="https://www.instagram.com/techzjc/" class="icon"><img
          src="https://static.techzjc.com/icon/icon-Instagram-white.svg" class="icon-img"/></a>
      <a href="https://www.youtube.com/channel/UC_UevpLekFBbIRv7wWEMe7w" class="icon"><img
          src="https://static.techzjc.com/icon/icon-YouTube-white.svg" class="icon-img"/></a>
    </div>
    <p>友情链接 ｜ Credits</p>
<!--    <p><lay-icon type="layui-icon-website"/>&nbsp;跟随系统 / 简体 / English</p>-->
    <p>© 2016-{{ currentYear }} Techzjc 版权所有</p>
    <div class="china-icp-info">
      <a href="https://beian.miit.gov.cn/" target="_blank" class="china-miit-icp-style">{{ ICP_NUMBER }}</a>
      <span>    |    </span>
      <a target="_blank" :href="CHINA_BEI_AN_REF_URL" class="china-bei-an-style"><img
          data-src="https://static.techzjc.com/icon/icon-beian.png" class="lazyload" alt="公安联网备案图标"/>
        <div>
          {{ CHINA_BEI_AN_NUMBER }}
        </div>
      </a>
    </div>
  </div>

</template>

<style scoped>
.footer {
  background-color: #000000;
  color: #ffffff;
  text-align: center;
  padding: 3em;
}

.social-media {
  margin-bottom: 1em;
}

.icon {
  margin: 0 0.1em;
}

.icon-img {
  width: 32px;
}

.china-icp-info {
  margin: 0 auto;
  padding: 20px 0;
}

.china-miit-icp-style {
  display: inline-block;
  text-decoration: none;
  height: 20px;
  line-height: 20px;
  margin: 0 0 0 5px;
  color: #ffffff;
}

.china-bei-an-style {
  display: inline-block;
  text-decoration: none;
  height: 20px;
  line-height: 20px;
}

.china-bei-an-style img {
  float: left;
}

.china-bei-an-style div {
  float:left;
  height:20px;
  line-height:20px;
  margin: 0 0 0 5px;
  color: #ffffff
}


</style>