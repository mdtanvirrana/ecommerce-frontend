export const FILTER_COLORS = [
  { name: "Green", hex: "#00C12B" },
  { name: "Red", hex: "#F50606" },
  { name: "Yellow", hex: "#F5DD06" },
  { name: "Orange", hex: "#F57906" },
  { name: "Cyan", hex: "#06CAF5" },
  { name: "Blue", hex: "#063AF5" },
  { name: "Purple", hex: "#7D06F5" },
  { name: "Pink", hex: "#F506A4" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#000000" },
] as const;

export const FILTER_SIZES = [
  "XX-Small",
  "X-Small",
  "Small",
  "Medium",
  "Large",
  "X-Large",
  "XX-Large",
  "3X-Large",
  "4X-Large",
] as const;

export const DRESS_STYLE_CARDS = [
  {
    name: "Casual",
    slug: "casual",
    image: "/images/style-casual.jpg",
    desktopColSpan: "md:col-span-4",
  },
  {
    name: "Formal",
    slug: "formal",
    image: "/images/style-formal.jpg",
    desktopColSpan: "md:col-span-8",
  },
  {
    name: "Party",
    slug: "party",
    image: "/images/style-party.jpg",
    desktopColSpan: "md:col-span-8",
  },
  {
    name: "Gym",
    slug: "gym",
    image: "/images/style-gym.jpg",
    desktopColSpan: "md:col-span-4",
  },
] as const;

export const HAPPY_CUSTOMERS = [
  {
    name: "Sarah M.",
    rating: 5,
    quote:
      "I'm blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations.",
  },
  {
    name: "Alex K.",
    rating: 5,
    quote:
      "Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable, catering to a variety of tastes and occasions.",
  },
  {
    name: "James L.",
    rating: 5,
    quote:
      "As someone who's always on the lookout for unique fashion pieces, I'm thrilled to have stumbled upon Shop.co. The selection of clothes is not only diverse but also on-point with the latest trends.",
  },
  {
    name: "Mooen R.",
    rating: 5,
    quote:
      "Fast delivery, accurate sizing, and incredible attention to stitching and fabric weight. Shop.co has completely replaced my usual weekend mall visits.",
  },
] as const;

export const PRODUCT_REVIEWS = [
  {
    name: "Samantha D.",
    rating: 4.5,
    date: "Posted on August 14, 2023",
    quote:
      "I absolutely love this t-shirt! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It's become my favorite go-to shirt.",
  },
  {
    name: "Alex M.",
    rating: 4,
    date: "Posted on August 15, 2023",
    quote:
      "The t-shirt exceeded my expectations! The colors are vibrant and the print quality is top-notch. Being a UI/UX designer myself, I'm quite picky about aesthetics, and this t-shirt definitely gets a thumbs up from me.",
  },
  {
    name: "Ethan R.",
    rating: 3.5,
    date: "Posted on August 16, 2023",
    quote:
      "This t-shirt is a must-have for anyone who appreciates good design. The minimalistic yet stylish pattern caught my eye, and the fit is perfect. I can see the designer's touch in every aspect of this shirt.",
  },
  {
    name: "Olivia P.",
    rating: 4,
    date: "Posted on August 17, 2023",
    quote:
      "As a UI/UX enthusiast, I value simplicity and functionality. This t-shirt not only represents those principles but also feels great to wear. It's evident that the designer poured their creativity into making this t-shirt stand out.",
  },
  {
    name: "Liam K.",
    rating: 4,
    date: "Posted on August 18, 2023",
    quote:
      "This t-shirt is a fusion of comfort and creativity. The fabric is soft, and the design speaks volumes about the designer's skill. It's like wearing a piece of art that reflects my passion for both design and fashion.",
  },
  {
    name: "Ava H.",
    rating: 4.5,
    date: "Posted on August 19, 2023",
    quote:
      "I'm not just wearing a t-shirt; I'm wearing a piece of design philosophy. The intricate details and thoughtful layout of the design make this shirt a conversation starter.",
  },
] as const;

export const PRODUCT_FAQS = [
  {
    question: "How does sizing run on SHOP.CO garments?",
    answer:
      "Our pieces are tailored for a modern true-to-size fit. If you prefer an oversized streetwear silhouette, we recommend sizing up by one size.",
  },
  {
    question: "How long does shipping take and is free delivery available?",
    answer:
      "Standard orders ship within 1–2 business days. Flat-rate shipping is $15, and orders of $250 or more qualify for complimentary free shipping.",
  },
  {
    question: "What is your return and cancellation policy?",
    answer:
      "Unworn items with original tags may be returned within 30 days. Orders cancelled before shipping are automatically refunded to your original payment method.",
  },
  {
    question: "How should I wash and care for this garment?",
    answer:
      "Machine wash cold inside-out with similar colors on a gentle cycle. Tumble dry low or hang dry to preserve fabric softness, shape, and graphic print vibrancy.",
  },
  {
    question: "Are promo codes and online payments secure?",
    answer:
      "Yes. All promo codes are validated server-side, and card payments are processed through encrypted Stripe PaymentIntents with server-side webhook verification.",
  },
] as const;
