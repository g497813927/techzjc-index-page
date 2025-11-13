import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './About.css';
import { faCamera, faCode, faFilm, faGamepad, faGraduationCap, faHeart, faMusic } from '@fortawesome/free-solid-svg-icons';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons/faEllipsis';


export function About() {
    return (
        <section id="about" className="container">
            <h1>About Me</h1>
            <div className="about-section">
                <div className="card hobby-card">
                    <div className="card-icon">
                        <FontAwesomeIcon icon={faHeart} size="2x" />
                    </div>
                    <h2>Hobbies</h2>
                    <ul>
                        <li>
                            <FontAwesomeIcon icon={faCode} size="3x" /><br />Programming
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faCamera} size="3x" /><br />Photography
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faFilm} size="3x" /><br />Video Editing
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faMusic} size="3x" /><br />Listen to Music
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faGamepad} size="3x" /><br />Playing Games
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faEllipsis} size="3x" /><br />More
                        </li>
                    </ul>
                </div>
                <div className="card education-card">
                    <div className="card-icon">
                        <FontAwesomeIcon icon={faGraduationCap} size="2x" />
                    </div>
                    <h2>Education</h2>
                    <ul>
                        <li>M.S. in Computer Science &amp; Application, Virginia Tech, 2025 - Present</li>
                        <li>B.S. in Computer Science, Virginia Tech, 2021 - 2025</li>
                        <li>High School Diploma, Hangzhou High School, 2017 - 2020</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}