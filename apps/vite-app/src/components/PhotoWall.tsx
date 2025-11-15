import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';
const fetchedPhotos1: string[] = [
    "https://static.techzjc.com/photos/harbor.webp",
    "https://static.techzjc.com/photos/bergen-smalungeren.webp",
    "https://static.techzjc.com/photos/bergen-city.webp",
    "https://static.techzjc.com/photos/nyc-sky-view-2024-03-04.webp",
    "https://static.techzjc.com/photos/gilbert-place.webp",
    "https://static.techzjc.com/photos/hangzhou-high-school-qianjiang-campus-railing-2017.webp",
    "https://static.techzjc.com/photos/hangzhou-high-school-qianjiang-campus-snowman-2017.webp"
];

const fetchedPhotos2: string[] = [
    "https://static.techzjc.com/photos/milky-way-foxridge.webp",
    "https://static.techzjc.com/photos/star-trail-foxridge.webp",
    "https://static.techzjc.com/photos/perseids-2020.webp",
    "https://static.techzjc.com/photos/hangzhou-high-school-qianjiang-campus-zeiss-skymaster-zkp.webp",
    "https://static.techzjc.com/index/assets/image/hero-image.webp"
];


export function PhotoWall() {
    const photo_1 = [...fetchedPhotos1, ...fetchedPhotos1];
    const photo_2 = [...fetchedPhotos2, ...fetchedPhotos2];

    return (
        <div className="container photo-wall">
            <h1>Photos</h1>
            <div className="photos">
                {photo_1.map((url, index) => (
                    <ImageSkeleton key={index} url={url} alt={`Photo ${index + 1}`} />
                ))}
            </div>
            <br />
            <div className="photos reverse">
                {photo_2.map((url, index) => (
                    <ImageSkeleton key={index} url={url} alt={`Photo ${index + 1}`} />
                ))}
            </div>
        </div>
    )
}