"use client";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faCode, faFilm, faGamepad, faGraduationCap, faHeart, faMusic, faEllipsis, faHandshakeAngle } from '@fortawesome/free-solid-svg-icons';
import { LazyMotion, domAnimation, AnimatePresence, motion } from "motion/react";
import './About.css';

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
export function About(props: { dict: any }) {
    return (
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                <motion.section
                    id="about"
                    className="container"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1>{props.dict['about']['title']}</h1>
                    <div className="about-section">
                        <div className="introduction-header">
                            <motion.div
                                className="hand-wave"
                                aria-hidden="true"
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 1.5 }}
                                transition={{ type: "spring", stiffness: 500 }}
                            >
                                👋
                            </motion.div>
                            <h2>{props.dict['about']['introduction']['description_title']}</h2>
                        </div>
                        <motion.div
                            className="card hobby-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <motion.div
                                className="card-icon"
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 2 }}
                                transition={{ type: "spring", stiffness: 500 }}
                            >
                                <FontAwesomeIcon icon={faHeart} size="2x" />
                            </motion.div>
                            <h2>{props.dict['about']['hobbies']['title']}</h2>
                            <motion.ul>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faCode} size="3x" style={{
                                        color: "darkgreen"
                                    }} /><br />
                                    {props.dict['about']['hobbies']['children']['programming']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faCamera} size="3x" style={{
                                        color: "grey"
                                    }} /><br />
                                    {props.dict['about']['hobbies']['children']['photography']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faFilm} size="3x" style={{
                                        color: "maroon"
                                    }} /><br />
                                    {props.dict['about']['hobbies']['children']['video_editing']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faMusic} size="3x" style={{
                                        color: "hotpink"
                                    }} /><br />
                                    {props.dict['about']['hobbies']['children']['listen_to_music']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faGamepad} size="3x" style={{
                                        color: "darksalmon"
                                    }} /><br />{props.dict['about']['hobbies']['children']['playing_games']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faHandshakeAngle} size="3x" style={{
                                        color: "orange"
                                    }} /><br />
                                    {props.dict['about']['hobbies']['children']['help_others']}
                                </motion.li>
                                <motion.li
                                    initial={{ scale: 1, rotate: 0 }}
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    whileFocus={{ scale: 1.1, rotate: 10 }}
                                    whileTap={{ scale: 0.9, rotate: -10 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    <FontAwesomeIcon icon={faEllipsis} size="3x" /><br />{props.dict['about']['hobbies']['children']['more']}
                                </motion.li>
                            </motion.ul>
                        </motion.div>
                        <motion.div
                            className="card education-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <motion.div
                                className="card-icon"
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 2 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <FontAwesomeIcon icon={faGraduationCap} size="2x" />
                            </motion.div>
                            <h2>{props.dict['about']['education']['title']}</h2>
                            <motion.ul>
                                {/* eslint-disable-next-line */}
                                {props.dict['about']['education']['children'].map((entry: any, index: number) => (
                                    <motion.li
                                        key={index}
                                        initial={{ scale: 0 }}
                                        whileInView={{
                                            scale: 1,
                                            transition: {
                                                duration: 0.4
                                            }
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileFocus={{ scale: 1.02 }}
                                        transition={{ type: "spring", stiffness: 500 }}
                                    >
                                        {format(
                                            props.dict['about']['education'][parseEducationEntry(entry)],
                                            entry
                                        )}
                                    </motion.li>
                                ))}
                            </motion.ul>
                        </motion.div>
                    </div>
                </motion.section>
            </AnimatePresence>
        </LazyMotion>
    )
}