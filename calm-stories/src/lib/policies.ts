/** Public policy copy. Kept as data so legal/editorial can update it without touching UI. */
export const POLICIES: Record<string, { title: string; intro: string; sections: { heading: string; points: string[] }[] }> = {
  content: {
    title: "Content & AI policy",
    intro: "How Calm Stories keeps every story restful, original and honest about how it was made.",
    sections: [
      {
        heading: "Sleep-friendly by design",
        points: [
          "Stories avoid peril, violence, graphic content and cliffhangers, and end in a settled, restful place.",
          "Romance stays gentle and non-explicit. All content is suitable for a general adult audience; stories marked all-ages are suitable for teens.",
          "We describe Sleep Stories as designed for relaxation. We do not claim clinically validated sleep benefits.",
        ],
      },
      {
        heading: "Editorial review",
        points: [
          "Community series stay private until they pass Calm editorial review, including content safety, rights, sleep suitability, audio quality and AI-disclosure checks.",
          "Calm's automated production engine can never publish on its own: every episode needs explicit editorial approval.",
          "Calm Originals and Creator Originals are labelled clearly everywhere they appear.",
        ],
      },
      {
        heading: "AI disclosure",
        points: [
          "Series written or narrated with AI assistance carry a disclosure on their series page.",
          "Only licensed synthetic voices with documented consent are available. Voice cloning of real people is not permitted.",
          "Model, prompt, output and cost records are kept for every AI generation for auditing.",
        ],
      },
    ],
  },
  rights: {
    title: "Copyright & rights",
    intro: "Creators keep ownership of their original work and confirm they have the rights to publish it.",
    sections: [
      {
        heading: "Creator declarations",
        points: [
          "Before submitting a series, creators declare that the work is original, list any third-party material, and confirm voice consent.",
          "Stories may not use copyrighted characters, worlds, lyrics or music without appropriate rights.",
        ],
      },
      {
        heading: "Complaints and removal",
        points: [
          "Rights holders can report a series or episode from its page, or use the report form below. Copyright complaints are prioritised.",
          "While a complaint is investigated, content can be unpublished. Creators are notified and can respond.",
        ],
      },
    ],
  },
  report: {
    title: "Report a problem",
    intro: "Tell us about content that isn't sleep-friendly, infringes rights, or shouldn't be on Calm Stories.",
    sections: [
      {
        heading: "What happens next",
        points: ["Reports go to the Calm editorial team's review queue.", "We may remove content, request changes from the creator, or dismiss the report with a note."],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    intro: "Listening data is used to resume playback and personalise recommendations — nothing more.",
    sections: [
      {
        heading: "Your controls",
        points: [
          "Turn on Private listening history in Settings to stop recording listening events for analytics and recommendations.",
          "Your library, follows and progress are visible only to you.",
        ],
      },
    ],
  },
};
