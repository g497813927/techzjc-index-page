<script setup>

</script>

<template>
  <!-- Title -->
  <lay-container fluid class="title-container" id="about">
    <h1 class="title">关于</h1>
  </lay-container>
  <!-- Main Content -->
  <lay-container fluid class="main-container">
    <lay-row>
      <h1>关于 Techzjc</h1>
    </lay-row>
    <lay-row>
      <i>Techzjc 是一个持续拥有创新热情的网站</i>
    </lay-row>
    <br/>
    <lay-row>
      <p>
        专业: <lay-icon type="layui-icon-code-circle"/>&nbsp;计算机科学&nbsp;
        辅修: <lay-icon type="layui-icon-video"/>&nbsp;电影学&nbsp;
      </p>
    </lay-row>

    <br />
    <lay-row>
      <p>最常使用的代码语言</p>
    </lay-row>
    <br />
    <lay-row :space="10">
      <lay-progress :percent="27.74" :show-text="true" text="27.74% JavaScript" size="big" color="Yellow" circle :circleWidth="20"/>
      <lay-progress :percent="16.87" :show-text="true" text="16.87% Java" size="big" color="Brown" circle :circleWidth="20"/>
      <lay-progress :percent="16.87" :show-text="true" text="16.87% 汇编" size="big" color="SaddleBrown" circle :circleWidth="20"/>
      <lay-progress :percent="11.92" :show-text="true" text="11.92% Kotlin" size="big" color="MediumSlateBlue" circle :circleWidth="20"/>
      <lay-progress :percent="10.81" :show-text="true" text="10.81% HTML" size="big" color="Orange" circle :circleWidth="20"/>
      <lay-progress :percent="7.86" :show-text="true" text="7.86% Python" size="big" color="DodgerBlue" circle :circleWidth="20"/>
      <lay-progress :percent="4.44" :show-text="true" text="4.44% C" size="big" color="DarkSlateGray" circle :circleWidth="20"/>
      <lay-progress :percent="3.89" :show-text="true" text="3.89% CSS" size="big" color="DarkCyan" circle :circleWidth="20"/>
    </lay-row>
  </lay-container>
</template>

<style scoped>
.title-container {
  background-image: url("https://static.techzjc.com/img/img-2.webp");
}

.layui-progress-text  {
  color: black;
}
</style>