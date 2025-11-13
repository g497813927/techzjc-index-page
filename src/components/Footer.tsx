
import './Footer.css';
export function Footer() {
    return (
        <footer className="footer">
            <div>
                <a href="https://space.bilibili.com/30023942"><img src="https://static.techzjc.com/icon/icon-bilibili-white.svg" width="32" alt="bilibili" /></a>
                <a href="https://www.facebook.com/techzjc"><img src="https://static.techzjc.com/icon/icon-facebook-white.svg" width="32" alt="facebook" /></a>
                <a href="https://github.com/g497813927"><img src="https://static.techzjc.com/icon/icon-GitHub-white.svg" width="32" alt="github" /></a>
                <a href="https://www.instagram.com/techzjc/"><img src="https://static.techzjc.com/icon/icon-Instagram-white.svg" width="32" alt="instagram" /></a>
                <a href="https://www.youtube.com/channel/UC_UevpLekFBbIRv7wWEMe7w"><img src="https://static.techzjc.com/icon/icon-YouTube-white.svg" width="32" alt="youtube" /></a>
            </div>
            <p>友情链接 | <a href="./credits.html" target="_blank" style={{
                textDecorationLine: 'none',
                color: 'white'
            }}>Credits</a></p>
            <p>© 2016-{new Date().getFullYear()} Techzjc 版权所有</p>
            <div style={{
                margin: '0 auto',
                padding: '20px 0'
            }}>
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style={{
                    display: 'inline-block',
                    textDecoration: 'none',
                    height: '20px',
                    lineHeight: '20px',
                    margin: '0px 0px 0px 5px',
                    color: "white"
                }}>浙ICP备2020032105号</a>
                <span>    |    </span>
                <a target="_blank" rel="noopener" href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33010402004325" style={{
                    display: 'inline-block',
                    textDecoration: 'none',
                    height: '20px',
                    lineHeight: '20px'
                }}><img src="https://static.techzjc.com/icon/icon-beian.png" style={{
                    float: 'left'
                }} alt="公安联网备案" /><div style={{
                    float: 'left',
                    height: '20px',
                    lineHeight: '20px',
                    margin: '0px 0px 0px 5px',
                    color: 'white'
                }}>浙公网安备 33010402004325号</div></a>
            </div>
        </footer>
    )
}