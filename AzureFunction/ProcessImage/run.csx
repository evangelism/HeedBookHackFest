#r "System.IO"

using System.IO;
using Microsoft.ProjectOxford.Face;
using Microsoft.ProjectOxford.Common.Contract;

public static async Task Run(Stream InputFace, string name, IAsyncCollector<FaceEmotion> FaceData, TraceWriter log)
{
    log.Info($"Processing face {name}");
    var cli = new FaceServiceClient("e28dce81b6e04cab84636b2642562963");
    var res = await cli.DetectAsync(InputFace,false,false,new FaceAttributeType[] { FaceAttributeType.Age, FaceAttributeType.Emotion, FaceAttributeType.Gender});
    var fc = (from f in res
              orderby f.FaceRectangle.Width
              select f).FirstOrDefault();
    if (fc!=null)
    {
        log.Info($" - recorded face, age={fc.FaceAttributes.Age}");
        var R = new FaceEmotion();
        R.Time = DateTime.Now;
        R.FaceEmotionId = int.Parse(Path.GetFileNameWithoutExtension(name));
        /* var t = GetMainEmotion(fc.FaceAttributes.Emotions);
        R.EmotionType = t.Item1;
        R.EmotionValue = (int)(100*t.Item2);
        */
        R.Sex = fc.FaceAttributes.Gender.ToLower().StartsWith("m");
        R.Age = (int)fc.FaceAttributes.Age;
        await FaceData.AddAsync(R);
    }
    else log.Info(" - no faces found");
}
 
public Tuple<string,float> GetMainEmotion(EmotionScores s)
{
    float m = 0;
    string e = "";
    foreach (var p in s.GetType().GetProperties())
    {
        if ((float)p.GetValue(s)>m)
        {
            m = (float)p.GetValue(s);
            e = p.Name;
        }
    }
    return new Tuple<string,float>(e,m);
}


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
