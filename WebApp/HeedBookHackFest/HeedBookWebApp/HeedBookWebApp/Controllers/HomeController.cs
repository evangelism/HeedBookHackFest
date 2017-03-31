using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using HeedBookWebApp.Data;

namespace HeedBookWebApp.Controllers
{
    public class HomeController : Controller
    {

        private readonly ApplicationDbContext _context;

        public HomeController(ApplicationDbContext context)
        {
            _context = context;
        }


        public IActionResult Index()
        {
            return View();
        }

        public IActionResult EmotionShare()
        {
            return View();
        }


        [HttpGet]
        [Route("EmotionShareData/{DialogId}")]
        public IList<EmotionTypes> EmotionShareData([FromRoute] int DialogId)
        {
            var emotionnumber = _context.FaceEmotionGuid.Where(p => p.DialogId == DialogId).Count();
            List<EmotionTypes> ET = new List<EmotionTypes>();
            var ET1 = new EmotionTypes();
            ET1.emotionname = DialogId.ToString();
            ET1.share = _context.FaceEmotionGuid.Where(p => p.EmotionType == "Neutral" && p.DialogId == DialogId).Count();
            ET.Add(ET1);

            var ET2 = new EmotionTypes();
            ET2.emotionname = "Happiness";
            ET2.share = _context.FaceEmotionGuid.Where(p => p.DialogId == DialogId).Count();
            ET.Add(ET2);

            var ET3 = new EmotionTypes();
            ET3.emotionname = "Surprise";
            ET3.share = _context.FaceEmotionGuid.Where(p => p.DialogId == DialogId && p.EmotionType == "Surprise").Count();
            ET.Add(ET3);

            var ET4 = new EmotionTypes();
            ET4.emotionname = "Anger";
            ET4.share = _context.FaceEmotionGuid.Where(p => p.DialogId == DialogId && p.EmotionType == "Anger").Count();
            ET.Add(ET4);


            return ET;
        }

        public class EmotionTypes
        {
            public string emotionname{ get; set; }
            public int share { get; set; }
        }

        public IActionResult Contact()
        {
            ViewData["Message"] = "Your contact page.";

            return View();
        }

        public IActionResult Error()
        {
            return View();
        }
    }
}
