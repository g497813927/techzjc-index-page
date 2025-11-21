import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';

const copyrightNotice = `© ${new Date().getFullYear()} Techzjc (Jiacheng Zhao). All rights reserved.`;
const fetchedPhotos1: {name: string, url: string, alt?: string}[] = [
    {
        name: "Bergen Harbor",
        url: "/photos/harbor.webp",
        alt: "Harbor view in Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera."
    },
    {
        name: "Smålungeren Lake",
        url: "/photos/bergen-smalungeren.webp",
        alt: "Smålungeren Lake in Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera."
    },
    {
        name: "Bergen City",
        url: "/photos/bergen-city.webp",
        alt: "City view of Bergen, Norway. Taken during 2025 CSCW with Nikon Z8 camera."
    },
    {
        name: "NYC Sky View",
        url: "/photos/nyc-sky-view-2024-03-04.webp",
        alt: "Sky view of the Spiral building in NYC. Taken on March 4, 2024 with iPhone 15 Pro Max"
    },
    {
        name: "Virginia Tech Gilbert Place",
        url: "/photos/gilbert-place.webp",
        alt: "Gilbert Place at Virginia Tech campus. Taken during 2024 with iPhone 15 Pro Max"
    },
    {
        name: "Hangzhou High School Qianjiang Campus Railing",
        url: "/photos/hangzhou-high-school-qianjiang-campus-railing-2017.webp",
        alt: "Railing near the basketball court at Hangzhou High School Qianjiang Campus. Taken in winter 2017 with Nikon D7200"
    },
    {
        name: "Tiny Snowman",
        url: "/photos/hangzhou-high-school-qianjiang-campus-snowman-2017.webp",
        alt: "A tiny snowman on a bench at Hangzhou High School Qianjiang Campus. Taken in winter 2017 with Nikon D7200"
    }
];

const fetchedPhotos2: {name: string, url: string, alt?: string}[] = [
    {
        name: "Milky Way over Foxridge",
        url: "/photos/milky-way-foxridge.webp",
        alt: "Milky Way over Foxridge. Taken with Nikon Z8 on August 25, 2025."
    },
    {
        name: "Star Trail over Foxridge",
        url: "/photos/star-trail-foxridge.webp",
        alt: "Star Trail over Foxridge. Taken with Nikon Z8 on August 13, 2023 and stacked & processed using Adobe Photoshop & Adobe Lightroom."
    },
    {
        name: "Perseids Meteor Shower 2020",
        url: "/photos/perseids-2020.webp",
        alt: "Perseids Meteor Shower 2020. Taken with Nikon D7200 on August 13, 2020 in Tian Huang Ping, Anji, Zhejiang, China."
    },
    {
        name: "Hangzhou High School Qianjiang Campus Zeiss Skymaster ZKP",
        url: "/photos/hangzhou-high-school-qianjiang-campus-zeiss-skymaster-zkp.webp",
        alt: "Zeiss Skymaster ZKP's generated sky chart, taken at Hangzhou High School Qianjiang Campus on July 28, 2023 with Nikon Z8."
    },
    {
        name: "Hero Image for the Website",
        url: "/assets/image/hero-image.webp",
        alt: "Hero image for Techzjc website. Star Trail over Tian Huang Ping, Anji, Zhejiang, China. Taken with Nikon Z8 on August 16, 2025 and stacked & processed using Adobe Photoshop & Adobe Lightroom."
    }
];


export function PhotoWall() {
    const photo_1 = [...fetchedPhotos1, ...fetchedPhotos1];
    const photo_2 = [...fetchedPhotos2, ...fetchedPhotos2];

    return (
        <div className="container photo-wall">
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
