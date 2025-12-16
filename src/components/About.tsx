import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './About.css';
import { faCamera, faCode, faFilm, faGamepad, faGraduationCap, faHeart, faMusic, faEllipsis } from '@fortawesome/free-solid-svg-icons';

function parseEducationEntry(entry: {
    type: string;
    field?: string;
    institution: string;
    start: string;
    end?: string;
}) {
    const hasField = entry.field && entry.field.trim() !== '';
    const hasEnd = entry.end && entry.end.trim() !== '';
    if (hasField && hasEnd) return "education.item.full";
    if (hasField && !hasEnd) return "education.item.partial.no_end";
    if (!hasField && hasEnd) return "education.item.partial.no_field";
    return "education.item.partial.no_field_no_end";
}

function format(template: string, entry: {
    type: string;
    field?: string;
    institution: string;
    start: string;
    end?: string;
}) {
    return template
        .replace("{type}", entry.type)
        .replace("{field}", entry.field || "")
        .replace("{institution}", entry.institution)
        .replace("{start}", entry.start)
        .replace("{end}", entry.end || "");
}

//eslint-disable-next-line
export function About(props: {dict: any}) {
    return (
        <section id="about" className="container">
            <h1>{props.dict['about']['title']}</h1>
            <div className="about-section">
                <div className="card hobby-card">
                    <div className="card-icon">
                        <FontAwesomeIcon icon={faHeart} size="2x" />
                    </div>
                    <h2>{props.dict['about']['hobbies']['title']}</h2>
                    <ul>
                        <li>
                            <FontAwesomeIcon icon={faCode} size="3x" style={{
                                color: "darkgreen"
                            }}/><br />
                            {props.dict['about']['hobbies']['children']['programming']}
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faCamera} size="3x" style={{
                                color: "grey"
                            }} /><br />
                            {props.dict['about']['hobbies']['children']['photography']}
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faFilm} size="3x" style={{
                                color: "maroon"
                            }}/><br />
                            {props.dict['about']['hobbies']['children']['video_editing']}
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faMusic} size="3x" style={{
                                color: "hotpink"
                            }}/><br />
                            {props.dict['about']['hobbies']['children']['listen_to_music']}
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faGamepad} size="3x" style={{
                                color: "darksalmon"
                            }} /><br />{props.dict['about']['hobbies']['children']['playing_games']}
                        </li>
                        <li>
                            {/* Use twitter emoji's \ud83d\udc4b to make an icon appears like waving hand */}
                            <span className="hand-wave">
                                👋
                            </span>
                            {props.dict['about']['hobbies']['children']['help_others']}
                        </li>
                        <li>
                            <FontAwesomeIcon icon={faEllipsis} size="3x" /><br />{props.dict['about']['hobbies']['children']['more']}
                        </li>
                    </ul>
                </div>
                <div className="card education-card">
                    <div className="card-icon">
                        <FontAwesomeIcon icon={faGraduationCap} size="2x" />
                    </div>
                    <h2>{props.dict['about']['education']['title']}</h2>
                    <ul>
                        {/* eslint-disable-next-line */}
                        {props.dict['about']['education']['children'].map((entry: any, index: number) => (
                            <li key={index}>
                                {format(
                                    props.dict['about']['education'][parseEducationEntry(entry)],
                                    entry
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}