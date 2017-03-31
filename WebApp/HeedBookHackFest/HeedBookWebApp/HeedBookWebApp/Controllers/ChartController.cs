using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using HeedBookWebApp.Data;

namespace HeedBookWebApp.Controllers
{
    [Produces("application/json")]
    [Route("api/Chart")]
    public class ChartController : Controller
    {

        private readonly ApplicationDbContext _context;

        public ChartController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Route("EmotionShareData/{DialogId}")]
        public IList<EmotionTypes> EmotionShareData([FromRoute] int DialogId)
        {
            var emotionnumber = _context.FaceEmotionGuid.Where(p => p.DialogId == DialogId).Count();
            List<EmotionTypes> ET = new List<EmotionTypes>();
            if (emotionnumber == 0)
            {
                return ET;
            }
            else
            {
                var ET1 = new EmotionTypes();
                ET1.emotionname = "Neutral";
                ET1.share = Convert.ToInt32((_context.FaceEmotionGuid.Where(p => p.EmotionType == "Neutral" && p.DialogId == DialogId).Count() * 100) / emotionnumber);
                ET.Add(ET1);

                var ET2 = new EmotionTypes();
                ET2.emotionname = "Happiness";
                ET2.share = Convert.ToInt32((_context.FaceEmotionGuid.Where(p => p.EmotionType == "Happiness" && p.DialogId == DialogId).Count() * 100) / emotionnumber);
                ET.Add(ET2);

                var ET3 = new EmotionTypes();
                ET3.emotionname = "Surprise";
                ET3.share = Convert.ToInt32((_context.FaceEmotionGuid.Where(p => p.EmotionType == "Surprise" && p.DialogId == DialogId).Count() * 100) / emotionnumber);
                ET.Add(ET3);

                var ET4 = new EmotionTypes();
                ET4.emotionname = "Anger";
                ET4.share = Convert.ToInt32((_context.FaceEmotionGuid.Where(p => p.EmotionType == "Surprise" && p.DialogId == DialogId).Count() * 100) / emotionnumber);
                ET.Add(ET4);

                return ET;
            }
        }

        public class EmotionTypes
        {
            public string emotionname { get; set; }
            public int share { get; set; }
        }

    }
}