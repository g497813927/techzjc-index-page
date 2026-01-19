"use client";
import './Publications.css';
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { publications } from "@/data/publications";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faOrcid } from '@fortawesome/free-brands-svg-icons';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { joinAuthorsACMDL, venueShortToAcmQuote } from '@/utils/publicationUtils';

//eslint-disable-next-line
export function Publications(props: { dict: any }) {
    const [selected, setSelected] = useState<PublicationProps | null>(null);
    const [theme, setTheme] = useState<"light" | "dark">(
        typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light"
    );


    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            setTheme(currentTheme === "dark" ? "dark" : "light");
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return (
        <motion.div
            className='container publication-section'
            initial={{
                opacity: 0,
                y: 20
            }}
            whileInView={{
                opacity: 1,
                y: 0
            }}
            transition={{
                duration: 0.6
            }}
        >
            <h1>{props.dict['publications']['title']}</h1>
            <motion.ul>
                {publications.map((pub) => {
                    const key = pub.doi ?? pub.url ?? `${pub.title}-${pub.publication_year}`;

                    return (
                        <motion.li key={key} onClick={() => setSelected(pub)}
                            initial="initial"
                            whileHover="hover"
                            whileInView="inview"
                            variants={{
                                initial: {
                                    scale: 0
                                },
                                inview: {
                                    background: theme === "dark" ? "rgba(50, 50, 50, 0.4)" : "rgba(255, 255, 255, 0.4)",
                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                                    scale: 1,
                                    transition: {
                                        duration: 0.4
                                    }
                                },
                                hover: {
                                    background: theme === "dark" ? "rgba(70, 70, 70, 0.6)" : "rgba(255, 255, 255, 0.6)",
                                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
                                    scale: 1.02
                                }
                            }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            {/* click the citation to open modal */}
                            <div>
                                {joinAuthorsACMDL(pub.authors)}
                                {` ${pub.publication_year}. `}
                                {pub.title}.{" "}
                                In <em>{pub.venue_full}</em>
                                {pub.venue_short ? ` (${venueShortToAcmQuote(pub.venue_short)})` : ""}.
                                {pub.publisher ? ` ${pub.publisher},` : ""}
                                {pub.location ? ` ${pub.location}.` : ""}{" "}
                                {pub.doi ? (
                                    <Link
                                        href={`https://doi.org/${pub.doi}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        doi: {pub.doi}
                                    </Link>
                                ) : ""}
                                {pub.url && !pub.doi ? (
                                    <Link
                                        href={pub.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        URL: {pub.url}
                                    </Link>
                                ) : ""}
                            </div>
                            <motion.div className="publication-click-hint"
                                variants={{
                                    initial: {
                                        opacity: 0.7,
                                        scale: 1,
                                        rotate: 0
                                    },
                                    hover: {
                                        opacity: 1,
                                        scale: 1.2,
                                        rotate: 15
                                    }
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300
                                }}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} />
                            </motion.div>
                        </motion.li>
                    );
                })}
            </motion.ul>

            {/* Modal */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelected(null)}
                        className="publication-modal-backdrop"
                    >
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.97, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 10 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="publication-modal"
                        >
                            <motion.div className="publication-modal-header">
                                <h3>{selected.title}</h3>

                                <motion.button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    initial={{ opacity: 0.7, scale: 2, rotate: 0 }}
                                    whileHover={{ opacity: 1, scale: 2.5, rotate: 90 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    aria-label="Close publication details"
                                >
                                    &times;
                                </motion.button>
                            </motion.div>

                            <motion.div className="publication-modal-entries">
                                {selected.authors.length > 1 ? props.dict['publications']['authors'] : props.dict['publications']['author']}:
                                {" "}
                                {selected.authors.map((author, index) => (
                                    <span
                                        key={`${author.lastName}-${author.firstName}-${index}`}
                                        className={author.highlight ? "highlight-author" : ""}
                                    >
                                        {`${author.firstName} ${author.lastName}${author.suffix ? `, ${author.suffix}` : ""}`}
                                        {author.orcid ? (
                                            <>
                                                {" "}
                                                <motion.a
                                                    href={`https://orcid.org/${author.orcid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="orcid-link"
                                                    initial={{ opacity: 0.7, scale: 1 }}
                                                    whileHover={{ opacity: 1, scale: 2 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    <FontAwesomeIcon icon={faOrcid} />
                                                </motion.a>
                                                {" "}
                                            </>
                                        ) : null}
                                        {index < selected.authors.length - 2 ? ", " : index === selected.authors.length - 2 ? ", and " : ""}
                                    </span>
                                ))}
                            </motion.div>

                            {selected.doi && (
                                <motion.div className="publication-modal-entries">
                                    DOI: <a
                                        href={`https://doi.org/${selected.doi}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {selected.doi}
                                    </a>
                                </motion.div>
                            )}

                            <motion.div className="publication-modal-entries">
                                {props.dict['publications']['published_in']}: {" "}
                                <em>
                                    {selected.venue_full}
                                </em>
                                {selected.venue_short ? ` (${venueShortToAcmQuote(selected.venue_short)})` : ""}
                                {selected.publisher ? `, ${selected.publisher}` : ''}
                                {selected.location ? `, ${selected.location}` : ''}
                                {selected.pages ? `, pp. ${selected.pages}` : ''}.
                            </motion.div>

                            <motion.div className="publication-modal-entries publication-modal-entries-abstract">
                                {props.dict['publications']['abstract']}:
                                {selected.abstract ? (
                                    <p>{selected.abstract}</p>
                                ) : (
                                    <motion.div className="no-abstract">{props.dict['publications']['no_abstract']}</motion.div>
                                )}
                            </motion.div>

                            <motion.div className="publication-modal-entries publication-modal-entries-links">
                                {selected.doi && (
                                    <motion.a
                                        href={`https://doi.org/${selected.doi}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="publication-modal-link"
                                        initial={{ opacity: 0.8, scale: 1 }}
                                        whileHover={{ opacity: 1, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        {props.dict['publications']['view_doi']}
                                    </motion.a>
                                )}
                                {selected.url && (
                                    <motion.a
                                        // URL usually has full access, therefore prefer URL over DOI here if both are available
                                        href={selected.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="publication-modal-link"
                                        initial={{ opacity: 0.8, scale: 1 }}
                                        whileHover={{ opacity: 1, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        {props.dict['publications']['view_article']}
                                    </motion.a>
                                )}
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
