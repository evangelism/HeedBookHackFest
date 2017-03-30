using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace HeedBookWebApp.Models
{
    public class FaceEmotion
    {
        public int FaceEmotionId { get; set; }

        public DateTime Time  { get; set; }

        public string EmotionType { get; set; }

        public float EmotionValue { get; set; }

        public int DialogId { get; set; }

        public bool Sex { get; set; }

        public int Age { get; set; }

    }
}
