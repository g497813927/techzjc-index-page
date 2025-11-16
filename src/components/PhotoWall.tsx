import './PhotoWall.css';
import { ImageSkeleton } from './ImageSkeleton';
const fetchedPhotos1: string[] = [
    "/photos/harbor.webp",
    "/photos/bergen-smalungeren.webp",
    "/photos/bergen-city.webp",
    "/photos/nyc-sky-view-2024-03-04.webp",
    "/photos/gilbert-place.webp",
    "/photos/hangzhou-high-school-qianjiang-campus-railing-2017.webp",
    "/photos/hangzhou-high-school-qianjiang-campus-snowman-2017.webp"
];

const fetchedPhotos2: string[] = [
    "/photos/milky-way-foxridge.webp",
    "/photos/star-trail-foxridge.webp",
    "/photos/perseids-2020.webp",
    "/photos/hangzhou-high-school-qianjiang-campus-zeiss-skymaster-zkp.webp",
    "/assets/image/hero-image.webp"
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
