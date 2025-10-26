# Daily Blessings

A beautiful, distraction-free web application for displaying scripture-based blessings for meditation and reflection.

## ✨ Features

- **35+ Scripture-Based Blessings** - A rich collection of blessings drawn from Psalms, the Gospels, and Epistles
- **Daily Rotation** - A different blessing each day based on the day of year, ensuring consistency throughout the day
- **Beautiful Animations** - Sentences fade in one by one using GSAP, with 4-second pauses for meditation
- **Minimalist Design** - Clean, distraction-free UI with soft gradients and elegant typography
- **Responsive** - Works beautifully on all screen sizes

## 🙏 The Blessings

Each blessing is crafted to:
- Ground you in Scripture
- Encourage meditation and reflection
- Point you to God's character and promises
- Inspire practical application in daily life

The collection includes themes of:
- God's love and faithfulness
- Peace and rest in Christ
- Wisdom and guidance
- Grace and freedom
- Contentment and gratitude
- Serving others
- Trust and courage
- And much more!

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛠️ Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **GSAP** - Animation library
- **Geist Font** - Beautiful typography

## 📖 Scripture References

Every blessing includes its scriptural foundation, drawing from passages like:
- Psalm 23, 34, 37, 46, 63, 91, 103, 139, and more
- Matthew 6, 7, 11, 13, 22
- Philippians 4, Ephesians 1, 2, 4
- Romans 6, 8, 12
- Galatians 5, 6
- Colossians 3
- Hebrews 6, 13
- 1 John 4
- And many others

## 🎨 Customization

You can easily add more blessings by editing `/lib/blessings.ts`:

```typescript
{
  scripture: "Psalm 23:1-3",
  text: "May you marvel that the Lord is your Shepherd today..."
}
```

## 💡 Future Enhancements

- User accounts to track favorite blessings
- Ability to share blessings
- Audio narration
- More blessing collections by theme
- Mobile app versions

---

*"May God's word be a lamp to your feet and a light to your path today."* - Psalm 119:105

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
