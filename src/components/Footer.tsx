
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Footer.css';
import { faBilibili, faFacebook, faGithub, faGitlab, faGoogleScholar, faInstagram, faLinkedin, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { DebugItem } from './DebugItem';

export function Footer() {
    
    return (
        <footer className="footer">
            <div className="social-icons">
                <a href="https://space.bilibili.com/30023942" className="social-icon" title="bilibili">
                    <FontAwesomeIcon icon={faBilibili} size="2x" />
                </a>
                <a href="mailto:admin@techzjc.com" className="social-icon" title="email">
                    <FontAwesomeIcon icon={faEnvelope} size="2x" />
                </a>
                <a href="https://www.facebook.com/techzjc" className="social-icon" title="facebook">
                    <FontAwesomeIcon icon={faFacebook} size="2x" />
                </a>
                <a href="https://git.cs.vt.edu/techzjc" className="social-icon" title="gitlab">
                    <FontAwesomeIcon icon={faGitlab} size="2x" />
                </a>
                <a href="https://github.com/g497813927" className="social-icon" title="github">
                    <FontAwesomeIcon icon={faGithub} size="2x" />
                </a>
                <a href="https://scholar.google.com/citations?user=bfAU2pYAAAAJ" className="social-icon" title="google-scholar">
                    <FontAwesomeIcon icon={faGoogleScholar} size="2x" />
                </a>
                <a href="https://www.instagram.com/techzjc/" className="social-icon" title="instagram">
                    <FontAwesomeIcon icon={faInstagram} size="2x" />
                </a>
                <a href="https://www.linkedin.com/in/techzjc/" className="social-icon" title="linkedin">
                    <FontAwesomeIcon icon={faLinkedin} size="2x" />
                </a>
                <a href="https://www.youtube.com/@techzjc" className="social-icon" title="youtube">
                    <FontAwesomeIcon icon={faYoutube} size="2x" />
                </a>
            </div>
            <DebugItem />
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
                }}><Image src="https://static.techzjc.com/icon/icon-beian.webp" 
                        width={20}
                        height={20}
                        style={{
                            float: 'left',
                            width: '20px',
                            height: '20px'
                        }} alt="公安联网备案" />
                <div style={{
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
