<script setup>

</script>

<template>
  <!-- Title -->
  <lay-container fluid class="title-container" id="apps">
    <h1 class="title">应用</h1>
  </lay-container>
  <lay-container class="main-container">
    <lay-row>
      <h1>视频频道</h1>
    </lay-row>
    <lay-row>
      <i>上传视频的地方</i>
    </lay-row>
    <hr />
    <lay-row>
      <h2>B站</h2>
    </lay-row>
    <lay-row :space="10">
      <lay-col :md="12">
        <iframe data-src="//player.bilibili.com/player.html?aid=452311385&bvid=BV1Dj411p7qK&cid=1367661742&p=1" class="video lazyload" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" muted></iframe>
      </lay-col>
      <lay-col :md="12">
        <iframe data-src="//player.bilibili.com/player.html?aid=457256914&bvid=BV1W5411j7gk&cid=241590252&page=1" class="video lazyload" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" muted></iframe>
      </lay-col>
      <lay-col :md="12">
        <iframe data-src="//player.bilibili.com/player.html?aid=842307211&bvid=BV1t54y1k7Z1&cid=241592232&page=1" class="video lazyload" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" muted></iframe>
      </lay-col>
      <lay-col :md="12">
        <iframe data-src="//player.bilibili.com/player.html?aid=884281987&bvid=BV1kK4y1Y7Zq&cid=227684649&page=1" class="video lazyload" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" muted></iframe>
      </lay-col>
    </lay-row>
    <br />
    <lay-row>
      <a href="https://space.bilibili.com/30023942" target="_blank">
        <lay-ripple>
          <lay-button>查看更多</lay-button>
        </lay-ripple>
      </a>
    </lay-row>
  </lay-container>
</template>

<style scoped>
.title-container {
  background-image: url("https://static.techzjc.com/img/img-3.webp");
}

lay-col {
  padding: 10px;
}

@media screen and (max-width: 991px) {
  .video {
    width: 100%;
    height: calc(100vw * 0.5625);
  }
}

@media screen and (min-width: 991px) {
  .video {
    width: 100%;
    height: calc(50vw * 0.5625);
  }
}
</style>