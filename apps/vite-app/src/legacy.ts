export const legacyHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!--Basic Setting Block-->
    <meta charset="UTF-8">
    <meta name="keywords" content="techzjc, 科技ZJC网, ZJC科技网, Techzjc, ZJC, 赵佳成, g497813927">
    <meta name="description" content="Techzjc是一个持续拥有创新热情的网站，由赵佳成建立。">
    <title>Techzjc</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!--Stylesheet Import Block-->
    <link rel="stylesheet" href="https://static.techzjc.com/css/w3.css" />
    <link rel="stylesheet" href="https://static.techzjc.com/css/index.css" />
    <link rel="stylesheet" href="https://static.techzjc.com/css/bootstrap.min.css" />
    <!--Icon Import Block-->
    <link rel="icon" href="https://static.techzjc.com/icon/favicon_index_page.ico" type="image/x-icon" />
    <link rel="shortcut icon" href="https://static.techzjc.com/icon/favicon_index_page.ico" type="image/x-icon"/>
    <link rel="bookmark" href="https://static.techzjc.com/icon/bookmark_icon_index_page.png" />
    <meta name="apple-mobile-web-app-title" content="主页-ZJC技术网">
    <link rel="apple-touch-icon-precomposed" sizes="180x180" href="https://static.techzjc.com/icon/bookmark_icon_index_page.png">
    <!--JavaScript Import Block-->
    <script type="text/javascript" src="https://static.techzjc.com/js/index.js"></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/zepto.min.js"></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/bootstrap.min.js"></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/popper.min.js"></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/changetitle_zh-CN.js"></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/lazysizes.min.js" async></script>
    <script type="text/javascript" src="https://static.techzjc.com/js/festival.js"></script>
    
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-180156130-1"></script>
    <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "lrib0ta3nt");
    </script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
    
        gtag('config', 'UA-180156130-1');
    </script>
</head>
<body>
<noscript>
    <div class="w3-animate-down alert alert-danger alert-dismissible show" id="alert-no-JS">
        <div class="w3-animate-down alert alert-danger alert-dismissible show">
            <h3>请注意！</h3>
            <hr />
            <p>ZJC技术网（techzjc）需要JavaScript才可以正常运作！</p>
            <p>看起来你的浏览器不支持JavaScript或者你使用了NoScript之类的插件禁用了JavaScript！</p>
            <p>如果你是前者，建议下载最新的Google Chrome或Mozilla Firefox以便正常访问</p>
            <p>如果你是后者，建议在对应插件内设置临时允许或信任JavaScript</p>
            <p>给您带来的不便，敬请谅解！</p>
        </div>
    </div>
</noscript>
<div class="festival" id="parent_node_festival" style="display: none;"></div>
<div class="w3-bar" id="myNavbar">
    <a href="#home" class="w3-bar-item w3-button"><img src="https://static.techzjc.com/icon/icon-logo-black-no-subtitle.svg" height="16"/></a>
    <a class="w3-bar-item w3-button w3-hover-black w3-hide-medium w3-hide-large w3-right container" href="javascript:void(0);" onclick="toggleFunction(); menuChange(this)">
        <div class="container" id="menu" onclick="menuChange(this)">
            <div class="bar1"></div>
            <div class="bar2"></div>
            <div class="bar3"></div>
        </div>
    </a>
    <a href="#about" class="w3-bar-item w3-button w3-hide-small"><img src="https://static.techzjc.com/icon/icon-user-black.svg" height="16" /> 关于Techzjc</a>
    <a href="#apps" class="w3-bar-item w3-button w3-hide-small"><img src="https://static.techzjc.com/icon/icon-apps-black.svg" height="16" /> 应用</a>
    <!--<a href="#social_networks" class="w3-bar-item w3-button w3-hide-small"><img src="https://static.techzjc.com/icon/icon-chat-black.svg" height="16" /> 社交媒体</a>-->
    <a href="./index_en-US.html" class="w3-bar-item w3-button w3-hide-small w3-right w3-hover-red">
        <img src="https://static.techzjc.com/icon/icon-global-black.svg" height="16" />
        English Version
    </a>
</div>

<!-- Navbar on small screens -->
<div id="navDemo" class="w3-bar-block w3-white w3-hide w3-hide-large w3-hide-medium">
    <a href="#about" class="w3-bar-item w3-button">关于Techzjc</a>
    <a href="#apps" class="w3-bar-item w3-button">应用</a>
    <!--<a href="#social_networks" class="w3-bar-item w3-button">社交媒体</a>-->
    <a href="./index_en-US.html" class="w3-bar-item w3-button">English Version</a>
</div>

<!-- First Parallax Image with Logo Text -->
<div class="bgimg-1 w3-display-container w3-opacity-min" id="home">
    <div class="alert alert-primary alert-dismissible" id="alert-translation_en-US" style="display: none">
        <button type="button" class="close" data-dismiss="alert" onclick="alert_translation(this)">&times;</button>
        <p>
              <span>
                Wanna English Appearance of the website?
                <strong>
                  <a href="./index_en-US.html">
                    Click Here
                  </a>
                </strong>
              </span>
        </p>
        留在中文（简体）界面？请点击右边的关闭按钮！
    </div>
    <script type="text/javascript" src="https://static.techzjc.com/js/translate_detect_is_en-US.js"></script>
    <div class="w3-display-middle" style="white-space:nowrap;">
        <span class="w3-center w3-padding-large w3-xlarge w3-wide w3-animate-opacity"><img src="icon/icon-logo-white.svg" width="100%"/></span>
    </div>
</div>


<!-- Container (About Section) -->
<div class="w3-content w3-container w3-padding-64" id="about">
    <h3 class="w3-center">关于 TECHZJC</h3>
    <p class="w3-center"><em>Techzjc是一个持续拥有创新热情的网站，由赵佳成建立。</em></p>
    <p></p>
<!--    <div class="w3-row">-->
<!--        <div class="w3-col m6 w3-center w3-padding-large">-->
<!--            <p><b><i class="fa fa-user w3-margin-right"></i>My Name</b></p><br>-->
<!--            <img src="/w3images/avatar_hat.jpg" class="w3-round w3-image w3-opacity w3-hover-opacity-off" alt="Photo of Me" width="500" height="333">-->
<!--        </div>-->

<!--        &lt;!&ndash; Hide this text on small devices &ndash;&gt;-->
<!--        <div class="w3-col m6 w3-hide-small w3-padding-large">-->
<!--            <p>Welcome to my website. I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure-->
<!--                dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum consectetur adipiscing elit, sed do eiusmod tempor-->
<!--                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>-->
<!--        </div>-->
<!--    </div>-->
    <p class="w3-large w3-center w3-padding-16">这一个网站包含了：</p>
    <p class="w3-wide"><img src="https://static.techzjc.com/icon/icon-camera-black.svg" width="20" /> 图片</p>
    <div class="w3-light-grey">
        <div class="w3-container w3-padding-small w3-dark-grey w3-center" style="width:40%">40%</div>
    </div>
    <p class="w3-wide"><img src="https://static.techzjc.com/icon/icon-note-black.svg" width="20"> 教程</p>
    <div class="w3-light-grey">
        <div class="w3-container w3-padding-small w3-dark-grey w3-center" style="width:40%">40%</div>
    </div>
    <p class="w3-wide"><img src="https://static.techzjc.com/icon/icon-film-black.svg" width="20"> Vlog</p>
    <div class="w3-light-grey">
        <div class="w3-container w3-padding-small w3-dark-grey w3-center" style="width:20%">20%</div>
    </div>
</div>

<div class="w3-row w3-center w3-dark-grey w3-padding-16">
    <div class="w3-quarter w3-section">
        <span class="w3-xlarge">9+</span><br>
        在B站上传的<br>视频
    </div>
    <div class="w3-quarter w3-section">
        <span class="w3-xlarge">5+</span><br>
        目前正在研究的<br>Github项目
    </div>
    <!--
    <div class="w3-quarter w3-section">
        <span class="w3-xlarge">20+</span><br>
        高清照片<br>（预计2021年春季前开放）
    </div>
    <div class="w3-quarter w3-section">
        <span class="w3-xlarge">10+</span><br>
        博客文章<br>（预计2021年春季前开放）
    </div>
    -->
    <em>网站虽小，但自强</em>
</div>

<!-- Second Parallax Image with APPS Text -->
<div class="bgimg-2 w3-display-container w3-opacity-min">
    <div class="w3-display-middle">
        <span class="w3-xxlarge w3-text-white w3-wide">应用</span>
    </div>
</div>

<!-- Container (APPS Section) -->
<!--
<div class="w3-content w3-container w3-padding-64" id="apps">
    <h3 class="w3-center">博客</h3>
    <div class="link link-blog">
        <span class="icon"></span>
    </div>
    <p class="w3-center"><em>一个充满创造力的地方</em></p><br>
<!--    <button class="w3-button w3-padding-large w3-light-grey w3-row-padding w3-center" style="">LOAD MORE</button>-->
    <!-- Responsive Grid. Four columns on tablets, laptops and desktops. Will stack on mobile devices/small screens (100% width) 
    <div class="w3-row-padding w3-center">
        <button class="w3-button w3-padding-large w3-light-grey" style="" disabled>（预计2021年春季前开放）</button>
    </div>
</div>
-->

<!-- Modal for full size images on click-->
<div id="modal01" class="w3-modal w3-black" onclick="this.style.display='none'">
    <span class="w3-button w3-large w3-black w3-display-topright" title="Close Modal Image"><i class="fa fa-remove"></i></span>
    <div class="w3-modal-content w3-animate-zoom w3-center w3-transparent w3-padding-64">
        <img id="img01" class="w3-image">
        <p id="caption" class="w3-opacity w3-large"></p>
    </div>
</div>

<!-- Third Parallax Image with Portfolio Text -->

<!--<div class="bgimg-3 w3-display-container w3-opacity-min">-->
<!--    <div class="w3-display-middle">-->
<!--        <span class="w3-xxlarge w3-text-white w3-wide">社交媒体</span>-->
<!--    </div>-->
<!--</div>-->

<!-- Container (Contact Section) -->

<div class="w3-content w3-container w3-padding-64" id="social_networks">
    <h3 class="w3-center">视频频道</h3>
    <p class="w3-center"><em>上传视频的地方</em></p>
    <hr />
    <h4 class="w3-center">B站</h4>
    <div class="w3-row-padding w3-center w3-section">
        <div class="w3-col m6">
            <div class="video">
                <iframe src="//player.bilibili.com/player.html?aid=457256914&bvid=BV1W5411j7gk&cid=241590252&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>
            </div>
        </div>
        <div class="w3-col m6">
            <div class="video">
                <iframe src="//player.bilibili.com/player.html?aid=842307211&bvid=BV1t54y1k7Z1&cid=241592232&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>
            </div>
        </div>
        <div class="w3-col m6">
            <div class="video">
                <iframe src="//player.bilibili.com/player.html?aid=884281987&bvid=BV1kK4y1Y7Zq&cid=227684649&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>
            </div>
        </div>
        <div class="w3-col m6">
            <div class="video">
                <iframe src="//player.bilibili.com/player.html?aid=969116318&bvid=BV1ip4y1q71c&cid=218504885&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>
            </div>
        </div>
        <a href="https://space.bilibili.com/30023942" target="_blank"><button class="w3-button w3-padding-large w3-light-grey" style="">观看更多</button></a>
    </div>
</div>

<!-- Footer -->
<footer class="w3-center w3-black w3-padding-64 w3-opacity w3-hover-opacity-off">
    <a href="#home" class="w3-button w3-light-grey"><img src="https://static.techzjc.com/icon/icon-arrow-up-black.svg" width="16px" /> 返回顶部</a>
    
    <div class="w3-xlarge w3-section">
        <a href="https://space.bilibili.com/30023942"><img src="https://static.techzjc.com/icon/icon-bilibili-white.svg" width="32" /></a>
        <a href="https://www.facebook.com/techzjc"><img src="https://static.techzjc.com/icon/icon-facebook-white.svg" width="32" /></a>
        <a href="https://github.com/g497813927"><img src="https://static.techzjc.com/icon/icon-GitHub-white.svg" width="32" /></a>
        <a href="https://www.instagram.com/techzjc/"><img src="https://static.techzjc.com/icon/icon-Instagram-white.svg" width="32" /></a>
        <a href="https://www.youtube.com/channel/UC_UevpLekFBbIRv7wWEMe7w"><img src="https://static.techzjc.com/icon/icon-YouTube-white.svg" width="32" /></a>
    </div>
    <p>友情链接 ｜ <a href="./credits.html" target="_blank" style="text-decoration-line: none; color: #ffffff">Credits</a></p>
    <p>© 2016-2023 Techzjc 版权所有</p>
    <div style="margin:0 auto; padding:20px 0;">
        <a href="https://beian.miit.gov.cn/" target="_blank" style="display:inline-block;text-decoration:none;height:20px;line-height:20px;margin: 0px 0px 0px 5px; color: #ffffff;">浙ICP备2020032105号</a>
        <span>    |    </span>
        <a target="_blank" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33010402004325" style="display:inline-block;text-decoration:none;height:20px;line-height:20px;"><img src="https://static.techzjc.com/icon/icon-beian.png" style="float:left;"/><div style="float:left;height:20px;line-height:20px;margin: 0px 0px 0px 5px; color: #ffffff">浙公网安备 33010402004325号</div></a>
    </div>
</footer>
</body>
</html>
`;