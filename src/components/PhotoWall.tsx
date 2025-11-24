import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';

export const copyrightNotice = `© ${new Date().getFullYear()} Techzjc (Jiacheng Zhao). All rights reserved.`;
export const fetchedPhotos1: {name: string, url: string, alt?: string; geoLocation?: string}[] = [
    {
        name: "Bergen Harbor",
        url: "/photos/harbor.webp",
        alt: "Harbor view in Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera.",
        geoLocation: "Bergen, Norway"
    },
    {
        name: "Smålungeren Lake",
        url: "/photos/bergen-smalungeren.webp",
        alt: "Smålungeren Lake in Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera.",
        geoLocation: "Bergen, Norway"
    },
    {
        name: "Bergen City",
        url: "/photos/bergen-city.webp",
        alt: "City view of Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera.",
        geoLocation: "Bergen, Norway"
    },
    {
        name: "NYC Sky View",
        url: "/photos/nyc-sky-view-2024-03-04.webp",
        alt: "Sky view of the Spiral building in NYC. Taken on March 4, 2024 with iPhone 15 Pro Max",
        geoLocation: "New York City, New York, USA"
    },
    {
        name: "Virginia Tech Gilbert Place",
        url: "/photos/gilbert-place.webp",
        alt: "Gilbert Place at Virginia Tech campus. Taken during 2024 with iPhone 15 Pro Max",
        geoLocation: "Blacksburg, Virginia, USA"
    },
    {
        name: "Hangzhou High School Qianjiang Campus Railing",
        url: "/photos/hangzhou-high-school-qianjiang-campus-railing-2017.webp",
        alt: "Railing near the basketball court at Hangzhou High School Qianjiang Campus. Taken in winter 2017 with Nikon D7200",
        geoLocation: "Hangzhou, Zhejiang, China"
    },
    {
        name: "Tiny Snowman",
        url: "/photos/hangzhou-high-school-qianjiang-campus-snowman-2017.webp",
        alt: "A tiny snowman on a bench at Hangzhou High School Qianjiang Campus. Taken in winter 2017 with Nikon D7200",
        geoLocation: "Hangzhou, Zhejiang, China"
    }
];

export const fetchedPhotos2: {name: string, url: string, alt?: string; geoLocation?: string}[] = [
    {
        name: "Milky Way over Foxridge",
        url: "/photos/milky-way-foxridge.webp",
        alt: "Milky Way over Foxridge. Taken with Nikon Z8 on August 25, 2025.",
        geoLocation: "Blacksburg, Virginia, USA"
    },
    {
        name: "Star Trail over Foxridge",
        url: "/photos/star-trail-foxridge.webp",
        alt: "Star Trail over Foxridge. Taken with Nikon Z8 on August 13, 2023 and stacked & processed using Adobe Photoshop & Adobe Lightroom.",
        geoLocation: "Blacksburg, Virginia, USA"
    },
    {
        name: "Perseids Meteor Shower 2020",
        url: "/photos/perseids-2020.webp",
        alt: "Perseids Meteor Shower 2020. Taken with Nikon D7200 on August 13, 2020 in Tian Huang Ping, Anji, Zhejiang, China.",
        geoLocation: "Tian Huang Ping, Anji, Zhejiang, China"
    },
    {
        name: "Hangzhou High School Qianjiang Campus Zeiss Skymaster ZKP",
        url: "/photos/hangzhou-high-school-qianjiang-campus-zeiss-skymaster-zkp.webp",
        alt: "Zeiss Skymaster ZKP's generated sky chart, taken at Hangzhou High School Qianjiang Campus on July 28, 2023 with Nikon Z8.",
        geoLocation: "Hangzhou, Zhejiang, China"
    },
    {
        name: "Hero Image for the Website",
        url: "/assets/image/hero-image.webp",
        alt: "Hero image for Techzjc website. Star Trail over Tian Huang Ping, Anji, Zhejiang, China. Taken with Nikon Z8 on August 16, 2025 and stacked & processed using Adobe Photoshop & Adobe Lightroom.",
        geoLocation: "Tian Huang Ping, Anji, Zhejiang, China"
    }
];


export function PhotoWall() {
    const photo_1 = [...fetchedPhotos1, ...fetchedPhotos1];
    const photo_2 = [...fetchedPhotos2, ...fetchedPhotos2];

    const photo_schema = [
        ...fetchedPhotos1.map(photo => ({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "name": photo.name,
            "contentUrl": `https://techzjc.com${photo.url}`,
            "url": `https://techzjc.com${photo.url}`,
            "description": photo.alt || "",
            "locationCreated": photo.geoLocation || "",
            "creator": {
                "@type": "Person",
                "name": "Jiacheng Zhao",
                "alternateName": "Techzjc",
                "url": "https://techzjc.com/"
            },
        })),
        ...fetchedPhotos2.map(photo => ({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "name": photo.name,
            "contentUrl": `https://techzjc.com${photo.url}`,
            "url": `https://techzjc.com${photo.url}`,
            "description": photo.alt || "",
            "locationCreated": photo.geoLocation || "",
            "creator": {
                "@type": "Person",
                "name": "Jiacheng Zhao",
                "alternateName": "Techzjc",
                "url": "https://techzjc.com/"
            },
        }))
    ]

    return (
        <div className="container photo-wall">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(photo_schema) }} />
            <h1>Photos</h1>
            <div className="photos">
                {photo_1.map((photo, index) => (
                    <ImageSkeleton key={index} url={photo.url} alt={photo.alt + ' ' + copyrightNotice || photo.name} />
                ))}
            </div>
            <br />
            <div className="photos reverse">
                {photo_2.map((url, index) => (
                    <ImageSkeleton key={index} url={url.url} alt={url.alt  + ' ' + copyrightNotice || url.name} />
                ))}
            </div>
        </div>
    )
}
