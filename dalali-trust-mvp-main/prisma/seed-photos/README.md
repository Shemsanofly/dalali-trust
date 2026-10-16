# Sample listing photos

`npm run db:seed` uses real photos from this folder for the fictional `[SAMPLE]` listings.
A listing with no photos here gets generated placeholder images instead.

The included stock photos illustrate fictional listings. See [SOURCES.md](SOURCES.md)
for photographer credits, original photo pages and licence details.

Put 1–6 JPEG, PNG or WebP files in the folder named after the listing's neighbourhood.
They are used in file-name order, so the first one (e.g. `01.jpg`) becomes the cover photo.

| Folder         | Sample listing                                |
| -------------- | --------------------------------------------- |
| `sinza/`       | Self-contained room near Sinza Mori           |
| `mikocheni/`   | Two-bedroom apartment in Mikocheni B          |
| `kijitonyama/` | Single room with shared bathroom, Kijitonyama |
| `mbezi-beach/` | Three-bedroom house with garden, Mbezi Beach  |
| `kigamboni/`   | Studio apartment near the ferry, Kigamboni    |
| `njiro/`       | Two-bedroom house in Njiro                    |
| `area-d/`      | Self-contained room, Area D                   |
| `buswelu/`     | Apartment near Rock City Mall                 |

Photos are processed like real uploads: rotated upright, resized, converted to WebP, and
stripped of metadata such as GPS location.

Only add photos you have the right to use (your own, or ones whose licence allows it), and
then reset the database and seed it again:
`npm run db:reset` followed by `npm run db:seed`.

This folder is for development and demo data only. On a live site, landlords and agents add
photos of their own properties from **Dashboard → My listings**, and the seed never runs in
production.
